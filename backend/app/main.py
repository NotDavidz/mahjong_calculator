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
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best.pt")

vision_model = YOLO(MODEL_PATH)
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

class MeldModel(BaseModel):
    meld_type: str    # "pon", "chi", "kan", "shouminkan"
    suit: str         # "man", "pin", "sou", "honors"
    tiles: str        
    is_open: bool   

class HandRequest(BaseModel):
    # The closed hand separated by suit type
    closed_man: str = ""
    closed_pin: str = ""
    closed_sou: str = ""
    closed_honors: str = ""
    
    # The winning tile
    win_tile_value: str
    win_tile_suit: str
    
    # Game Context
    is_tsumo: bool = False
    is_riichi: bool = False
    seat_wind: str = "east"
    round_wind: str = "east"
    
    # Dora Indicators
    dora_man: str = ""
    dora_pin: str = ""
    dora_sou: str = ""
    dora_honors: str = ""
    
    melds: List[MeldModel] = []

def is_sequential(t1, t2, t3):
    # Mahjong honors (z) and backs cannot form sequences
    if any(char in t for char in ['z', 'back', 'east', 'south', 'west', 'north', 'chun', 'hatsu', 'shaa', 'ton'] for t in [t1, t2, t3]):
        return False
    
    # Must be the exact same suit (m, p, or s)
    if not (t1[-1] == t2[-1] == t3[-1]):
        return False
        
    try:
        # Check if the numbers are consecutive (e.g., 3, 4, 5)
        v1, v2, v3 = int(t1[0]), int(t2[0]), int(t3[0])
        return v1 + 1 == v2 and v2 + 1 == v3
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
            
        # Dora
        dora_indicators = TilesConverter.string_to_136_array(
            man=req.dora_man,
            pin=req.dora_pin,
            sou=req.dora_sou,
            honors=req.dora_honors,
            has_aka_dora=True
        )
        if not dora_indicators:
            dora_indicators = None
            
        # Context
        config = HandConfig(
            is_tsumo=req.is_tsumo,
            is_riichi=req.is_riichi,
            player_wind=WIND_MAP.get(req.seat_wind, EAST),
            round_wind=WIND_MAP.get(req.round_wind, EAST),
            options=OptionalRules(has_aka_dora=True) # Enables Red 5s (passed as "0")
        )
        
        # Calculate the scores
        result = calculator.estimate_hand_value(
            tiles=tiles, 
            win_tile=win_tile, 
            melds=mahjong_melds, 
            dora_indicators=dora_indicators, 
            config=config
        )
        
        if result.error:
            return {"status": "error", "message": result.error}
            
        return {
            "status": "success",
            "han": result.han,
            "fu": result.fu,
            "points": result.cost['main'],
            "additional_points": result.cost.get('additional', 0),
            "yaku": [yaku.name for yaku in result.yaku],
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # 1. Read image file into OpenCV
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 2. Run YOLO Inference
        results = vision_model.predict(img, conf=0.3, iou=0.5, agnostic_nms=True)[0]
        
        # 3. Extract bounding boxes into a workable dictionary
        detected_tiles = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cls_id = int(box.cls[0].item())
            class_name = vision_model.names[cls_id]
            
            width = x2 - x1
            height = y2 - y1
            
            detected_tiles.append({
                "name": class_name,
                "x_center": (x1 + x2) / 2,
                "y_center": (y1 + y2) / 2,
                "is_sideways": width > height # Our tie-breaker boolean
            })

        if not detected_tiles:
            raise HTTPException(status_code=400, detail="No tiles detected.")

        # 4. The Y-Axis Slicer
        avg_y = sum(t["y_center"] for t in detected_tiles) / len(detected_tiles)
        
        top_row = [t for t in detected_tiles if t["y_center"] < avg_y]
        bottom_row = [t for t in detected_tiles if t["y_center"] >= avg_y]

        # 5. Sort Rows by X-Coordinate (Left to Right)
        top_row.sort(key=lambda t: t["x_center"])
        bottom_row.sort(key=lambda t: t["x_center"])

        # 6. Feed bottom row to the Multi-Parse NFA
        # This will return a list of valid configurations (usually length 1)
        valid_meld_configurations = get_all_valid_parses(bottom_row)

        return {
            "status": "success",
            "closed_hand_raw": [t["name"] for t in top_row],
            "bottom_row_raw": [t["name"] for t in bottom_row], # NEW: See exactly what the NFA is trying to parse
            "meld_options": valid_meld_configurations,
            "requires_user_disambiguation": len(valid_meld_configurations) > 1,
            
            # --- DEEP DEBUGGING INFO ---
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