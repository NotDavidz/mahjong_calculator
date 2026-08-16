from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from mahjong.hand_calculating.hand import HandCalculator
from mahjong.tile import TilesConverter
from mahjong.hand_calculating.hand_config import HandConfig, OptionalRules
from mahjong.meld import Meld
from mahjong.constants import EAST, SOUTH, WEST, NORTH
from fastapi.middleware.cors import CORSMiddleware

import os
import cv2
import numpy as np
from fastapi import UploadFile, File

# --- NEW ONNX IMPORTS ---
import onnxruntime as ort

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best.onnx") # Note the .onnx extension!

# --- LOAD ONNX SESSION ---
ort_session = ort.InferenceSession(MODEL_PATH)
model_inputs = ort_session.get_inputs()
input_name = model_inputs[0].name

# --- HARDCODE CLASS NAMES ---
# These are your 38 classes extracted exactly from your training logs
CLASS_NAMES = [
    "0m", "0p", "0s", "1m", "1p", "1s", "2m", "2p", "2s", "3m", "3p", "3s",
    "4m", "4p", "4s", "5m", "5p", "5s", "6m", "6p", "6s", "7m", "7p", "7s",
    "8m", "8p", "8s", "9m", "9p", "9s", "back", "chun", "haku", "hatsu",
    "nan", "pei", "shaa", "ton"
]

app = FastAPI(title="Mahjong Point Calculator API")
calculator = HandCalculator()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins during local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WIND_MAP = {"east": EAST, "south": SOUTH, "west": WEST, "north": NORTH}
MELD_MAP = {
    "pon": Meld.PON,
    "chi": Meld.CHI,
    "kan": Meld.KAN,
    "shouminkan": Meld.SHOUMINKAN
}
HONOR_MAP = {
    "ton": "1", "nan": "2", "shaa": "3", "pei": "4",
    "haku": "5", "hatsu": "6", "chun": "7"
}

SUIT_MAP = {"m": "man", "p": "pin", "s": "sou"}

class MeldModel(BaseModel):
    meld_type: str    # "pon", "chi", "kan", "shouminkan"
    suit: str         # "man", "pin", "sou", "honors"
    tiles: str        
    is_open: bool   

class HandRequest(BaseModel):
    closed_man: str = ""
    closed_pin: str = ""
    closed_sou: str = ""
    closed_honors: str = ""
    win_tile_value: str
    win_tile_suit: str
    is_tsumo: bool = False
    is_riichi: bool = False
    is_double_riichi: bool = False 
    is_ippatsu: bool = False       
    is_under_the_sea: bool = False 
    is_kan_win: bool = False            # NEW
    is_first_turn_win: bool = False     # NEW
    seat_wind: str = "east"
    round_wind: str = "east"
    honba: int = 0                      # NEW
    dora_indicators: List[str] = []     # NEW
    ura_dora_indicators: List[str] = [] # NEW
    
    melds: List[MeldModel] = []

def letterbox_image(img, target_shape=(640, 640), color=(114, 114, 114)):
    """Resizes image to target shape while maintaining aspect ratio with padding."""
    shape = img.shape[:2]  # [height, width]
    r = min(target_shape[0] / shape[0], target_shape[1] / shape[1])
    new_unpad = (int(round(shape[1] * r)), int(round(shape[0] * r)))
    
    dw = (target_shape[1] - new_unpad[0]) / 2  # width padding
    dh = (target_shape[0] - new_unpad[1]) / 2  # height padding

    if shape[::-1] != new_unpad:  # Resize if needed
        img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)
        
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return img, r, dw, dh

def is_sequential(t1, t2, t3):
    # Mahjong honors (z) and backs cannot form sequences
    if any(char in t for char in ['z', 'back', 'east', 'south', 'west', 'north', 'chun', 'hatsu', 'shaa', 'ton'] for t in [t1, t2, t3]):
        return False
    
    # Must be the exact same suit (m, p, or s)
    if not (t1[-1] == t2[-1] == t3[-1]):
        return False
        
    try:
        v1 = 5 if t1[0] == '0' else int(t1[0])
        v2 = 5 if t2[0] == '0' else int(t2[0])
        v3 = 5 if t3[0] == '0' else int(t3[0])
        # Check if the numbers are consecutive (e.g., 3, 4, 5)
        vals = sorted([v1, v2, v3])
        return vals[0] + 1 == vals[1] and vals[1] + 1 == vals[2]
    except ValueError:
        return False
    
def get_all_valid_parses(tokens):
    all_valid_parses = []

    def backtrack(remaining_tokens, current_parse):
        # BASE CASE: We successfully consumed every token!
        if len(remaining_tokens) == 0:
            all_valid_parses.append(current_parse)
            return

        # BRANCH 1: Concealed Kan (Ankan) - 4 Tiles ['back', 'X', 'X', 'back']
        if len(remaining_tokens) >= 4:
            t1, t2, t3, t4 = remaining_tokens[0:4]
            if t1['name'] == 'back' and t4['name'] == 'back' and t2['name'] == t3['name']:
                backtrack(
                    remaining_tokens[4:], 
                    current_parse + [{"type": "ankan", "tiles": [t1['name'], t2['name'], t3['name'], t4['name']], "is_open": False}]
                )

        # BRANCH 2: Open Kan - 4 Identical Tiles
        if len(remaining_tokens) >= 4:
            names = [t['name'] for t in remaining_tokens[0:4]]
            if len(set(names)) == 1:
                backtrack(
                    remaining_tokens[4:], 
                    current_parse + [{"type": "kan", "tiles": names, "is_open": True}]
                )

        # BRANCH 3: Pon - 3 Identical Tiles
        if len(remaining_tokens) >= 3:
            names = [t['name'] for t in remaining_tokens[0:3]]
            if len(set(names)) == 1:
                backtrack(
                    remaining_tokens[3:], 
                    current_parse + [{"type": "pon", "tiles": names, "is_open": True}]
                )

        # BRANCH 4: Chi - 3 Sequential Tiles
        if len(remaining_tokens) >= 3:
            t1, t2, t3 = remaining_tokens[0:3]
            if is_sequential(t1['name'], t2['name'], t3['name']):
                backtrack(
                    remaining_tokens[3:], 
                    current_parse + [{"type": "chi", "tiles": [t1['name'], t2['name'], t3['name']], "is_open": True}]
                )
                    
    backtrack(tokens, [])
    return all_valid_parses

def translate_yolo_to_mahjong(yolo_tiles):
    """
    Converts a list of YOLO tile strings (e.g., ['1s', '2s', '0p', 'hatsu'])
    into suit strings for the mahjong library.
    """
    suits = {"m": "", "p": "", "s": "", "z": ""}
    
    for tile in yolo_tiles:
        if tile == "back":
            continue

        if tile in HONOR_MAP:
            suits["z"] += HONOR_MAP[tile]
        else:
            # e.g., '1s' -> value '1', suit 's'
            # e.g., '0p' -> value '0' (Red 5), suit 'p'
            value = tile[0] 
            suit = tile[1]  
            suits[suit] += value
            
    # Sort the strings so "312" becomes "123"
    suits["m"] = "".join(sorted(suits["m"]))
    suits["p"] = "".join(sorted(suits["p"]))
    suits["s"] = "".join(sorted(suits["s"]))
    suits["z"] = "".join(sorted(suits["z"]))
    
    return suits

def format_nfa_meld_for_api(meld_dict):
    """
    Translates NFA output -> MeldModel format for the calculator.
    Example: {"type": "chi", "tiles": ["1s", "2s", "3s"], "is_open": True} 
          -> {"meld_type": "chi", "suit": "sou", "tiles": "123", "is_open": True}
    """
    raw_tiles = meld_dict["tiles"]
    meld_type = meld_dict["type"]
    is_open = meld_dict["is_open"]
    
    # 1. Handle Ankan (strip the 'back' tiles so we can read the suit)
    visible_tiles = [t for t in raw_tiles if t != "back"]
    sample_tile = visible_tiles[0] 

    if not visible_tiles:
        sample_tile = "haku"
        visible_tiles = ["haku", "haku"] # Spoof the missing inner faces
    else:
        sample_tile = visible_tiles[0]

    # 2. Extract Suit and Tile Numbers
    if sample_tile in HONOR_MAP:
        suit = "honors"
        tiles_str = "".join([HONOR_MAP[t] for t in visible_tiles])
    else:
        suit_char = sample_tile[-1]
        suit = SUIT_MAP[suit_char]
        tiles_str = "".join([t[0] for t in visible_tiles]) # Gets the numbers
        
    # 3. Ensure Kans have 4 characters (Ankan only has 2 visible tiles, so we duplicate)
    if meld_type in ["kan", "ankan"]:
        tiles_str = tiles_str[0] * 4
        
    # 4. Normalize Ankan to "kan" (The API uses is_open=False to know it's Ankan)
    api_meld_type = "kan" if meld_type == "ankan" else meld_type
    
    return {
        "meld_type": api_meld_type,
        "suit": suit,
        "tiles": "".join(sorted(tiles_str)), # Ensure "213" becomes "123"
        "is_open": is_open
    }

#Calculate points
@app.post("/calculate")
def calculate_hand(req: HandRequest):
    try:
        #Convert closed into array
        tiles = TilesConverter.string_to_136_array(
            man=req.closed_man, 
            pin=req.closed_pin, 
            sou=req.closed_sou, 
            honors=req.closed_honors,
            has_aka_dora=True
        )
        
        #Convert winning 
        win_args = {req.win_tile_suit: req.win_tile_value, "has_aka_dora": True}
        win_tile = TilesConverter.string_to_136_array(**win_args)[0]
        
        #Process open handed or closed kans
        mahjong_melds = []
        for m in req.melds:
            meld_args = {m.suit: m.tiles, "has_aka_dora": True}
            meld_tiles = TilesConverter.string_to_136_array(**meld_args)
            mahjong_melds.append(
                Meld(
                    meld_type=MELD_MAP[m.meld_type], 
                    tiles=meld_tiles, 
                    opened=m.is_open
                )
            )
            
        # Context
        player_wind = WIND_MAP.get(req.seat_wind, EAST)
        
        # NEW: Helper to convert dora strings ("1m", "5p", "3z") to 136 format
        def parse_dora(dora_list):
            res = []
            for d in dora_list:
                val, suit = d[0], d[1]
                if suit == 'm': res.append(TilesConverter.string_to_136_array(man=val)[0])
                elif suit == 'p': res.append(TilesConverter.string_to_136_array(pin=val)[0])
                elif suit == 's': res.append(TilesConverter.string_to_136_array(sou=val)[0])
                elif suit == 'z': res.append(TilesConverter.string_to_136_array(honors=val)[0])
            return res

        # NEW: Combine and parse all dora indicators
        all_dora_136 = parse_dora(req.dora_indicators) + parse_dora(req.ura_dora_indicators)

        config = HandConfig(
            is_tsumo=req.is_tsumo,
            is_riichi=req.is_riichi,
            is_daburu_riichi=req.is_double_riichi,
            is_ippatsu=req.is_ippatsu,
            is_haitei=req.is_under_the_sea and req.is_tsumo,   
            is_houtei=req.is_under_the_sea and not req.is_tsumo,
            is_rinshan=req.is_kan_win and req.is_tsumo,                               
            is_chankan=req.is_kan_win and not req.is_tsumo,                           
            is_tenhou=req.is_first_turn_win and req.is_tsumo and player_wind == EAST, 
            is_chiihou=req.is_first_turn_win and req.is_tsumo and player_wind != EAST, # FIXED
            is_renhou=req.is_first_turn_win and not req.is_tsumo,                     
            player_wind=player_wind,
            round_wind=WIND_MAP.get(req.round_wind, EAST),
            options=OptionalRules(has_aka_dora=True) 
        )
        
        # Calculate the scores (passing new Dora format)
        result = calculator.estimate_hand_value(
            tiles=tiles, 
            win_tile=win_tile, 
            melds=mahjong_melds, 
            dora_indicators=all_dora_136 if all_dora_136 else None, 
            config=config
        )
        
        if result.error:
            return {"status": "error", "message": result.error}
            
        # NEW: Apply Honba sticks (300 points total per stick)
        honba_bonus = req.honba * 300
        main_points = result.cost['main']
        add_points = result.cost.get('additional', 0)
        
        if req.is_tsumo:
            if player_wind == EAST:
                main_points += int(honba_bonus / 3) # Dealer pays 1/3 per player
            else:
                main_points += int(honba_bonus / 3) # Dealer portion
                add_points += int(honba_bonus / 3)  # Non-dealer portion
        else:
            main_points += honba_bonus # Ron payer pays all Honba

        # --- NEW: Format Yaku with their dynamic Han values ---
        is_hand_open = any(m.is_open for m in req.melds)
        formatted_yaku = []
        for yaku in result.yaku:
            if getattr(yaku, 'is_yakuman', False):
                han_val = "Yakuman"
            else:
                han_val = yaku.han_open if is_hand_open else yaku.han_closed
            # Pass the raw integer to the frontend so it can be translated!
            formatted_yaku.append({"name": yaku.name, "han": han_val})
        # ------------------------------------------------------

        return {
            "status": "success",
            "han": result.han,
            "fu": result.fu,
            "points": main_points,
            "additional_points": add_points,
            "yaku": formatted_yaku,
        }
        
    except Exception as e:
        return {"status": "error", "message": f"Game state error: {str(e)}. Check for impossible combinations (e.g., 5 of the same tile)."}


@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # 1. Read image file into OpenCV
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 2. Pre-process for ONNX
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_padded, ratio, pad_w, pad_h = letterbox_image(img_rgb, target_shape=(640, 640))
        
        # Convert to float32, normalize, and transpose to Channel-First (CHW)
        blob = img_padded.astype(np.float32) / 255.0
        blob = np.transpose(blob, (2, 0, 1))
        blob = np.expand_dims(blob, axis=0) # Add batch dimension -> (1, 3, 640, 640)

        # 3. Run ONNX Inference
        outputs = ort_session.run(None, {input_name: blob})
        predictions = outputs[0][0] # Shape: (42, 8400) - 42 is 4 box coords + 38 classes

        # 4. Post-process (Manual Tensor Math)
        predictions = np.transpose(predictions) # Swap to (8400, 42) for easier reading
        
        boxes = predictions[:, :4]  # First 4 columns are [x_center, y_center, width, height]
        scores = np.max(predictions[:, 4:], axis=1) # Highest class probability per box
        class_ids = np.argmax(predictions[:, 4:], axis=1) # The class index that had the highest prob

        # Filter out low confidence detections
        conf_threshold = 0.3
        mask = scores > conf_threshold
        boxes = boxes[mask]
        scores = scores[mask]
        class_ids = class_ids[mask]

        # 5. Non-Maximum Suppression (Remove overlapping duplicate boxes)
        # Convert [x_center, y_center, w, h] to [x_min, y_min, w, h] for OpenCV NMS
        x_min = boxes[:, 0] - (boxes[:, 2] / 2)
        y_min = boxes[:, 1] - (boxes[:, 3] / 2)
        boxes_cv = np.column_stack([x_min, y_min, boxes[:, 2], boxes[:, 3]]).tolist()
        scores_cv = scores.tolist()
        
        indices = cv2.dnn.NMSBoxes(boxes_cv, scores_cv, score_threshold=0.3, nms_threshold=0.5)

        # 6. Extract the final accepted bounding boxes
        detected_tiles = []
        if len(indices) > 0:
            for i in indices.flatten():
                # Scale coordinates back to the original un-padded image resolution
                orig_x_center = (boxes[i, 0] - pad_w) / ratio
                orig_y_center = (boxes[i, 1] - pad_h) / ratio
                orig_w = boxes[i, 2] / ratio
                orig_h = boxes[i, 3] / ratio

                class_name = CLASS_NAMES[class_ids[i]]
                
                detected_tiles.append({
                    "name": class_name,
                    "x_center": orig_x_center,
                    "y_center": orig_y_center,
                    "is_sideways": orig_w > orig_h
                })

        if not detected_tiles:
            raise HTTPException(status_code=400, detail="No tiles detected.")

        # --- The rest of your exact grouping logic remains unchanged ---
        
        # 7. The Y-Axis Slicer & Concealed Hand Check
        y_coords = [t["y_center"] for t in detected_tiles]
        min_y = min(y_coords)
        max_y = max(y_coords)
        vertical_spread = max_y - min_y

        if vertical_spread < 300: 
            top_row = detected_tiles
            bottom_row = []
            avg_y = None
        else:
            avg_y = sum(y_coords) / len(y_coords)
            top_row = [t for t in detected_tiles if t["y_center"] < avg_y]
            bottom_row = [t for t in detected_tiles if t["y_center"] >= avg_y]

        if not top_row and bottom_row:
            top_row = bottom_row
            bottom_row = []

        # 8. Sort Rows by X-Coordinate (Left to Right)
        top_row.sort(key=lambda t: t["x_center"])
        bottom_row.sort(key=lambda t: t["x_center"])

        # 9. Feed bottom row to the Multi-Parse NFA
        raw_meld_configurations = get_all_valid_parses(bottom_row)
        
        formatted_meld_configurations = []
        for configuration in raw_meld_configurations:
            formatted_config = [format_nfa_meld_for_api(meld) for meld in configuration]
            formatted_meld_configurations.append(formatted_config)

        # 10. Translate the closed hand for the API
        top_row_names = [t["name"] for t in top_row]
        parsed_closed_hand = translate_yolo_to_mahjong(top_row_names)

        return {
            "status": "success",
            "closed_hand_raw": top_row_names,
            "closed_hand_parsed": parsed_closed_hand, 
            "bottom_row_raw": [t["name"] for t in bottom_row], 
            "meld_options": formatted_meld_configurations, 
            "requires_user_disambiguation": len(formatted_meld_configurations) > 1,
            
            "debug_y_axis_split": avg_y,
            "debug_raw_detections": [
                {
                    "name": t["name"], 
                    "x": round(t["x_center"], 1), 
                    "y": round(t["y_center"], 1)
                } for t in detected_tiles
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))















def main():
    pass

if __name__ == "__main__":
    main()