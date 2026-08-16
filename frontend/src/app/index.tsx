import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Switch, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { TileIcon } from '@/components/tileIcon';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

const ALL_TILES = [
  '1m','2m','3m','4m','5m','0m','6m','7m','8m','9m',
  '1p','2p','3p','4p','5p','0p','6p','7p','8p','9p',
  '1s','2s','3s','4s','5s','0s','6s','7s','8s','9s',
  'ton','nan','shaa','pei','haku','hatsu','chun'
];

// --- LOCALIZATION DICTIONARIES ---
const translations = {
  en: {
    title: "Mahjong Calculator",
    scanButton: "Scan Hand",
    analyzing: "Analyzing...",
    confirmHand: "Confirm Closed Hand",
    subtext: "Tap a tile to delete it.",
    confirmMelds: "Confirm Open Melds",
    confirmButton: "Confirm Hand",
    winningTilePrompt: "Tap Your Winning Tile!",
    tsumo: "Tsumo",
    ron: "Ron",
    honba: "Honba (Sticks)",
    rinshan: "Rinshan Kaihou (Win off Replacement)",
    chankan: "Chankan (Robbing a Kan)",
    haitei: "Haitei Raoyue (Under the Sea)",
    houtei: "Houtei Raoyui (Under the River)",
    tenhou: "Tenhou (Blessing of Heaven)",
    chiho: "Chiihou (Blessing of Earth)",
    renhou: "Renhou (Blessing of Man)",
    riichi: "Riichi",
    wRiichi: "W-Riichi",
    none: "None",
    ippatsu: "Ippatsu",
    dora: "Dora Indicators",
    uraDora: "Ura Dora Indicators",
    seatWind: "Seat Wind",
    roundWind: "Round Wind",
    calculateButton: "Calculate Score",
    calculating: "Calculating...",
    scanAnother: "Scan Another Hand",
    selectTileToAdd: "Select Tile to Add",
    cancel: "Cancel",
    pts: "pts",
    all: "ALL",
    han: "Han",
    fu: "fu",
    yakuman: "Yakuman",
    doubleYakuman: "Double Yakuman",
    tripleYakuman: "Triple Yakuman",
    quadYakuman: "Quadruple Yakuman",
    quinYakuman: "Quintuple Yakuman",
    sexYakuman: "Sextuple Yakuman",
    countedYakuman: "Counted Yakuman",
    winds: { east: "East", south: "South", west: "West", north: "North" }
  },
  zh: {
    title: "日麻计分器",
    scanButton: "扫描手牌",
    analyzing: "分析中...",
    confirmHand: "确认门前手牌",
    subtext: "点击麻将即可删除误识别的牌。",
    confirmMelds: "确认副露",
    confirmButton: "确认手牌",
    winningTilePrompt: "请点击你的和牌！",
    tsumo: "自摸",
    ron: "荣和",
    honba: "本场",
    rinshan: "岭上开花",
    chankan: "枪杠",
    haitei: "海底捞月",
    houtei: "河底摸鱼",
    tenhou: "天和",
    chiho: "地和",
    renhou: "人和",
    riichi: "立直",
    wRiichi: "两立直",
    none: "无",
    ippatsu: "一发",
    dora: "宝牌指示牌",
    uraDora: "里宝牌指示牌",
    seatWind: "自风",
    roundWind: "场风",
    calculateButton: "计算得分",
    calculating: "计算中...",
    scanAnother: "扫描下一手牌",
    selectTileToAdd: "选择要添加的牌",
    cancel: "取消",
    pts: "点",
    all: "ALL",
    han: "番",
    fu: "符",
    yakuman: "役满",
    doubleYakuman: "两倍役满",
    tripleYakuman: "三倍役满",
    quadYakuman: "四倍役满",
    quinYakuman: "五倍役满",
    sexYakuman: "六倍役满",
    countedYakuman: "累计役满",
    winds: { east: "东", south: "南", west: "西", north: "北" }
  }
};

const yakuTranslations: Record<string, { en: string; zh: string }> = {
  // Common Yaku
  "Riichi": { en: "Riichi", zh: "立直" },
  "Menzen Tsumo": { en: "Concealed Self-Draw (Tsumo)", zh: "门前清自摸和" },
  "Tanyao": { en: "All Simples (Tanyao)", zh: "断幺九" },
  "Pinfu": { en: "Pinfu", zh: "平和" },
  "Iipeikou": { en: "Pure Double Sequence (Iipeikou)", zh: "一杯口" },
  "Ippatsu": { en: "Ippatsu", zh: "一发" },
  "Haitei Raoyue": { en: "Under the Sea (Haitei)", zh: "海底捞月" },
  "Houtei Raoyui": { en: "Under the River (Houtei)", zh: "河底摸鱼" },
  "Rinshan Kaihou": { en: "After a Kan (Rinshan)", zh: "岭上开花" },
  "Chankan": { en: "Robbing a Kan (Chankan)", zh: "枪杠" },
  "Double Riichi": { en: "Double Riichi", zh: "两立直" },
  "Sanshoku Doujun": { en: "Three-Suited Straight (Sanshoku)", zh: "三色同顺" },
  "Sanshoku Doukou": { en: "Three-Suited Triplets", zh: "三色同刻" },
  "San ankou": { en: "Three Concealed Triplets (Sanankou)", zh: "三暗刻" },
  "Ikkitsuukan": { en: "Full Straight (Ittsuu)", zh: "一气贯通" },
  "Chiitoitsu": { en: "Seven Pairs (Chiitoitsu)", zh: "七对子" },
  "Toitoi": { en: "All Triplets (Toitoi)", zh: "对对和" },
  "Chantai": { en: "Mixed Outside Hand (Chanta)", zh: "混全带幺九" },
  "San kantsu": { en: "Three Kans (Sankantsu)", zh: "三杠子" },
  "Shousangen": { en: "Little Three Dragons (Shousangen)", zh: "小三元" },
  "Honroutou": { en: "All Terminals and Honors (Honroutou)", zh: "混老头" },
  "Ryanpeikou": { en: "Twice Pure Double Sequence (Ryanpeikou)", zh: "二杯口" },
  "Junchantaiyaochuu": { en: "Pure Outside Hand (Junchan)", zh: "纯全带幺九" },
  "Honitsu": { en: "Half Flush (Honitsu)", zh: "混一色" },
  "Chinitsu": { en: "Full Flush (Chinitsu)", zh: "清一色" },
  
  // Doras
  "Dora": { en: "Dora", zh: "宝牌" },
  "Aka Dora": { en: "Red Five (Aka Dora)", zh: "赤宝牌" },
  "Ura Dora": { en: "Ura Dora", zh: "里宝牌" },

  // Exact Python-Mahjong Output Winds
  "Yakuhai (seat wind east)": { en: "Seat Wind (East)", zh: "自风：东" },
  "Yakuhai (seat wind south)": { en: "Seat Wind (South)", zh: "自风：南" },
  "Yakuhai (seat wind west)": { en: "Seat Wind (West)", zh: "自风：西" },
  "Yakuhai (seat wind north)": { en: "Seat Wind (North)", zh: "自风：北" },
  "Yakuhai (round wind east)": { en: "Round Wind (East)", zh: "场风：东" },
  "Yakuhai (round wind south)": { en: "Round Wind (South)", zh: "场风：南" },
  "Yakuhai (round wind west)": { en: "Round Wind (West)", zh: "场风：西" },
  "Yakuhai (round wind north)": { en: "Round Wind (North)", zh: "场风：北" },
  "Yakuhai (haku)": { en: "White Dragon (Haku)", zh: "役牌：白" },
  "Yakuhai (hatsu)": { en: "Green Dragon (Hatsu)", zh: "役牌：发" },
  "Yakuhai (chun)": { en: "Red Dragon (Chun)", zh: "役牌：中" },

  // Yakuman & Upgraded Yakuman
  "Kokushi Musou": { en: "Thirteen Orphans (Kokushi Musou)", zh: "国士无双" },
  "Kokushi musou juusanmen matchi": { en: "Thirteen Orphans (13-wait)", zh: "国士无双十三面" },
  "Suu ankou": { en: "Four Concealed Triplets (Suuankou)", zh: "四暗刻" },
  "Suu ankou tanki": { en: "Four Concealed Triplets (Single Wait)", zh: "四暗刻单骑" },
  "Dai sangen": { en: "Big Three Dragons (Daisangen)", zh: "大三元" },
  "Tsuu iisou": { en: "All Honors (Tsuuiisou)", zh: "字一色" },
  "Ryuuiisou": { en: "All Green (Ryuuiisou)", zh: "绿一色" },
  "Chin routou": { en: "All Terminals (Chinroutou)", zh: "清老头" },
  "Suu kantsu": { en: "Four Kans (Suukantsu)", zh: "四杠子" },
  "Shousuushii": { en: "Little Four Winds (Shousuushii)", zh: "小四喜" },
  "Dai suushii": { en: "Big Four Winds (Daisuushii)", zh: "大四喜" },
  "Chuuren Poutou": { en: "Nine Gates (Chuuren Poutou)", zh: "九莲宝灯" },
  "Junsei chuuren poutou": { en: "True Nine Gates", zh: "纯正九莲宝灯" },
  "Tenhou": { en: "Blessing of Heaven (Tenhou)", zh: "天和" },
  "Chiihou": { en: "Blessing of Earth (Chiho)", zh: "地和" },
  "Renhou": { en: "Blessing of Man (Renhou)", zh: "人和" }
};

const getTranslatedYaku = (yakuName: string, locale: 'en' | 'zh') => {
  // Direct match
  if (yakuTranslations[yakuName]) return yakuTranslations[yakuName][locale];
  
  // Case-insensitive fallback match (Bulletproof against python library changes)
  const lowerName = yakuName.toLowerCase();
  const matchKey = Object.keys(yakuTranslations).find(k => k.toLowerCase() === lowerName);
  if (matchKey) return yakuTranslations[matchKey][locale];
  
  return yakuName;
};

const formatHan = (han: number | string, locale: 'en' | 'zh') => {
  if (han === "Yakuman") return locale === 'zh' ? "役满" : "Yakuman";
  return locale === 'zh' ? `${han} 番` : `${han} Han`;
};
// ------------------------------------

export default function IndexScreen() {
  const [locale, setLocale] = useState<'en' | 'zh'>('en');
  const t = translations[locale];

  const [step, setStep] = useState<'upload' | 'camera' | 'edit' | 'context' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  
  const [showAddTileModal, setShowAddTileModal] = useState(false);
  const [editableClosedHand, setEditableClosedHand] = useState<string[]>([]);
  const [editableMelds, setEditableMelds] = useState<any[]>([]);
  
  const [winTileIndex, setWinTileIndex] = useState<number | null>(null);
  const [isTsumo, setIsTsumo] = useState(false);
  
  // NEW: 3-Way Segmented Control for Riichi
  const [riichiStatus, setRiichiStatus] = useState<'none' | 'riichi' | 'double'>('none');
  
  const [isIppatsu, setIsIppatsu] = useState(false);
  const [isUnderTheSea, setIsUnderTheSea] = useState(false);
  const [isKanWin, setIsKanWin] = useState(false);
  const [isFirstTurnWin, setIsFirstTurnWin] = useState(false);
  const [seatWind, setSeatWind] = useState('east');
  const [roundWind, setRoundWind] = useState('east');
  
  const [honba, setHonba] = useState<number>(0);
  const [doraIndicators, setDoraIndicators] = useState<string[]>([]);
  const [uraDoraIndicators, setUraDoraIndicators] = useState<string[]>([]);
  const [modalTarget, setModalTarget] = useState<'hand' | 'dora' | 'uradora'>('hand');
  const [calcResult, setCalcResult] = useState<any>(null);

  const hasOpenMeld = editableMelds.some(m => m.is_open);

  const handleRiichiChange = (val: 'none' | 'riichi' | 'double') => {
    setRiichiStatus(val);
    if (val === 'none') {
      setIsIppatsu(false);
      setUraDoraIndicators([]);
    }
  };

  const toggleKanWin = (val: boolean) => {
    setIsKanWin(val);
    if (val) setIsUnderTheSea(false);
  };

  const toggleUnderTheSea = (val: boolean) => {
    setIsUnderTheSea(val);
    if (val) setIsKanWin(false);
  };

  const removeTile = (indexToRemove: number) => {
    setEditableClosedHand(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const resetAndScanAnother = () => {
    setEditableClosedHand([]);
    setEditableMelds([]);
    setWinTileIndex(null);
    setIsTsumo(false);
    setRiichiStatus('none');
    setIsIppatsu(false);
    setIsUnderTheSea(false);
    setIsKanWin(false);
    setIsFirstTurnWin(false);
    setSeatWind('east');
    setRoundWind('east');
    setHonba(0);
    setDoraIndicators([]);
    setUraDoraIndicators([]);
    setCalcResult(null);
    setStep('upload');
  };

  const HONOR_MAP: Record<string, string> = {
    "ton": "1", "nan": "2", "shaa": "3", "pei": "4",
    "haku": "5", "hatsu": "6", "chun": "7"
  };

  const getYoloNamesFromMeld = (meld: any) => {
    const honorReverseMap: Record<string, string> = { "1": "ton", "2": "nan", "3": "shaa", "4": "pei", "5": "haku", "6": "hatsu", "7": "chun" };
    const tiles = meld.tiles.split('').map((char: string) => {
      if (meld.suit === "honors") return honorReverseMap[char];
      const suitChar = meld.suit === "man" ? "m" : meld.suit === "pin" ? "p" : "s";
      return `${char}${suitChar}`;
    });
    
    // NEW: Mask outer tiles for Ankans
    if (!meld.is_open && tiles.length === 4) {
      return ["back", tiles[1], tiles[2], "back"];
    }
    return tiles;
  };

  const translateToMahjong = (yoloTiles: string[]) => {
    const suits = { m: "", p: "", s: "", z: "" };
    yoloTiles.forEach(tile => {
      if (tile === "back") return;
      if (HONOR_MAP[tile]) {
        suits.z += HONOR_MAP[tile];
      } else {
        suits[tile[1] as keyof typeof suits] += tile[0];
      }
    });
    suits.m = suits.m.split('').sort().join('');
    suits.p = suits.p.split('').sort().join('');
    suits.s = suits.s.split('').sort().join('');
    suits.z = suits.z.split('').sort().join('');
    return suits;
  };

  const calculateScore = async () => {
    if (winTileIndex === null) {
      alert(locale === 'zh' ? "请点击你的胡牌！" : "Please tap your winning tile before calculating!");
      return;
    }
    setLoading(true);

    const allHandTiles = [...editableClosedHand];
    editableMelds.forEach(meld => {
      allHandTiles.push(...getYoloNamesFromMeld(meld));
    });

    const parsedHand = translateToMahjong(allHandTiles);
    const winningTile = editableClosedHand[winTileIndex];
    
    let winValue = "";
    let winSuit = "";
    if (HONOR_MAP[winningTile]) {
      winValue = HONOR_MAP[winningTile];
      winSuit = "honors";
    } else {
      winValue = winningTile[0];
      winSuit = winningTile[1] === "m" ? "man" : winningTile[1] === "p" ? "pin" : "sou";
    }

    const formatDora = (tiles: string[]) => tiles.map(t => HONOR_MAP[t] ? `${HONOR_MAP[t]}z` : t);

    const payload = {
      closed_man: parsedHand.m,
      closed_pin: parsedHand.p,
      closed_sou: parsedHand.s,
      closed_honors: parsedHand.z,
      win_tile_value: winValue,
      win_tile_suit: winSuit,
      is_tsumo: isTsumo,
      is_riichi: riichiStatus === 'riichi',
      is_double_riichi: riichiStatus === 'double',
      is_ippatsu: isIppatsu,
      is_under_the_sea: isUnderTheSea,
      is_kan_win: isKanWin,               
      is_first_turn_win: isFirstTurnWin,  
      seat_wind: seatWind,
      round_wind: roundWind,
      honba: honba,                                      
      dora_indicators: formatDora(doraIndicators),       
      ura_dora_indicators: formatDora(uraDoraIndicators),
      melds: editableMelds
    };

    try {
      const response = await fetch('https://pavos-riichi-calculator.onrender.com/calculate', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error("Calculation failed");
      const data = await response.json();
      
      if (data.status === "error") {
        alert(`${locale === 'zh' ? '无效手牌' : 'Invalid Hand'}: ${data.message}`);
        return; 
      }

      setCalcResult(data);
      setStep('result');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pickAndAnalyzeImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      await sendImageToBackend(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) await requestPermission();
    setStep('camera');
  };

  const takePictureAndProcess = async () => {
    if (!cameraRef.current) return;
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      
      // Rotate image 90 degrees counter-clockwise so the backend Y-slicer works properly
      const manipulatedImg = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ rotate: -90 }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      await sendImageToBackend(manipulatedImg.uri);
    } catch (e) {
      alert(locale === 'zh' ? "拍照失败" : "Failed to capture image");
      setLoading(false);
    }
  };

 const sendImageToBackend = async (uri: string) => {
  setLoading(true);
  try {
    const file = new File(uri);
    const formData = new FormData();
    formData.append('file', file as any);

    const response = await fetch('https://pavos-riichi-calculator.onrender.com/analyze-image', {
        method: 'POST', body: formData, headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (data.status === "success") {
      setEditableClosedHand(data.closed_hand_raw);
      setEditableMelds(data.meld_options && data.meld_options.length > 0 ? data.meld_options[0] : []);
      setStep('edit');
    }
  } catch (error: any) {
    alert(locale === 'zh' ? `上传失败: ${error.message}` : `Failed to upload image: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const renderHanFuOrYakuman = () => {
    const yakumanCount = calcResult.yaku?.filter((y: { name: string, han: string | number }) => y.han === 'Yakuman').length || 0;
    
    if (yakumanCount === 1) return t.yakuman;
    if (yakumanCount === 2) return t.doubleYakuman;
    if (yakumanCount === 3) return t.tripleYakuman;
    if (yakumanCount === 4) return t.quadYakuman;
    if (yakumanCount === 5) return t.quinYakuman;
    if (yakumanCount === 6) return t.sexYakuman;
    if (yakumanCount >= 7) return `${yakumanCount}x ${t.yakuman}`;
    
    if (calcResult.han >= 13) return t.countedYakuman;
    
    return `${calcResult.han} ${t.han} / ${calcResult.fu} ${t.fu}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* LANGUAGE TOGGLE HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t.title}</Text>
        <TouchableOpacity style={styles.langButton} onPress={() => setLocale(prev => prev === 'en' ? 'zh' : 'en')}>
          <Text style={styles.langButtonText}>{locale === 'en' ? '中文' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

      {/* PHASE 1: UPLOAD OR CAMERA */}
      {step === 'upload' && (
        <View style={{ alignItems: 'center', width: '100%' }}>
          <TouchableOpacity style={[styles.button, { marginBottom: 15, width: '80%', alignItems: 'center' }]} onPress={openCamera} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t.analyzing : `${t.scanButton} (Camera)`}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, { backgroundColor: '#555', width: '80%', alignItems: 'center' }]} onPress={pickAndAnalyzeImage} disabled={loading}>
            <Text style={styles.buttonText}>{locale === 'zh' ? '从相册上传' : 'Upload from Gallery'}</Text>
          </TouchableOpacity>
          
          {loading && <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />}
        </View>
      )}

      {/* PHASE 1.5: CUSTOM CAMERA */}
      {step === 'camera' && (
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} ref={cameraRef} facing="back">
            {/* The Overlay - splits screen when held sideways */}
            <View style={styles.overlayContainer}>
              <View style={styles.overlayHalf}>
                <Text style={styles.overlayText}>{locale === 'zh' ? '副露' : 'Melds'}</Text>
              </View>
              <View style={styles.overlayDivider} />
              <View style={styles.overlayHalf}>
                <Text style={styles.overlayText}>{locale === 'zh' ? '门前手牌' : 'Concealed Hand'}</Text>
              </View>
            </View>

            {/* Shutter Controls */}
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.closeCamBtn}
                  onPress={() => setStep('upload')}
                >
                  <Text style={styles.buttonText}>{t.cancel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shutterBtn}
                  onPress={takePictureAndProcess}
                >
                  <View style={styles.shutterInner} />
                </TouchableOpacity>

                <View style={{ width: 60 }} />
              </View>
          </CameraView>
        </View>
      )}

      {/* PHASE 2: EDIT HAND */}
      {step === 'edit' && (
        <View style={styles.editorContainer}>
          <Text style={styles.resultTitle}>{t.confirmHand}</Text>
          <Text style={styles.subtext}>{t.subtext}</Text> 

          <View style={styles.tileGrid}>
            {editableClosedHand.map((tileName, index) => (
              <TouchableOpacity key={index} onPress={() => removeTile(index)} style={styles.tileWrapper}>
                <TileIcon name={tileName} />
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              onPress={() => { setModalTarget('hand'); setShowAddTileModal(true); }} 
              style={[styles.tileWrapper, { width: 36, height: 48, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }]}
            >
              <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>+</Text>
            </TouchableOpacity>
          </View>

          {editableMelds.length > 0 && (
            <>
              <Text style={[styles.resultTitle, { marginTop: 20 }]}>{t.confirmMelds}</Text>
              <View style={styles.meldContainer}>
                {editableMelds.map((meld, mIdx) => (
                  <View key={mIdx} style={styles.meldGroup}>
                    {getYoloNamesFromMeld(meld).map((tileName: string, tIdx: number) => (
                      <View key={tIdx} style={styles.tileWrapper}>
                        <TileIcon name={tileName} />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.button, { marginTop: 30 }]} onPress={() => setStep('context')}>
            <Text style={styles.buttonText}>{t.confirmButton}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PHASE 3: GAME CONTEXT */}
      {step === 'context' && (
        <View style={styles.editorContainer}>
          <Text style={styles.resultTitle}>{t.winningTilePrompt}</Text>
          <View style={styles.tileGrid}>
            {editableClosedHand.map((tileName, index) => (
              <TouchableOpacity key={index} onPress={() => setWinTileIndex(index)} 
                style={[styles.tileWrapper, winTileIndex === index && styles.goldenHighlight]}>
                <TileIcon name={tileName} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.contextBox}>
            
            <View style={styles.segmentedControl}>
              <TouchableOpacity onPress={() => setIsTsumo(true)} style={[styles.segmentBtn, isTsumo && styles.segmentActive]}>
                <Text style={isTsumo ? styles.segmentTextActive : styles.segmentText}>{t.tsumo}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsTsumo(false)} style={[styles.segmentBtn, !isTsumo && styles.segmentActive]}>
                <Text style={!isTsumo ? styles.segmentTextActive : styles.segmentText}>{t.ron}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.switchRow, { marginTop: 10 }]}>
              <Text style={styles.label}>{t.honba}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <TouchableOpacity onPress={() => setHonba(Math.max(0, honba - 1))}><Text style={styles.counterBtn}>-</Text></TouchableOpacity>
                <Text style={styles.label}>{honba}</Text>
                <TouchableOpacity onPress={() => setHonba(honba + 1)}><Text style={styles.counterBtn}>+</Text></TouchableOpacity>
              </View>
            </View>

            {/* DYNAMIC WIN CONDITIONS */}
            {!hasOpenMeld && (
              <View style={styles.switchRow}>
                <Text style={styles.label}>{isTsumo ? (seatWind === 'east' ? t.tenhou : t.chiho) : t.renhou}</Text>
                <Switch value={isFirstTurnWin} onValueChange={setIsFirstTurnWin}/>
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.label}>{isTsumo ? t.rinshan : t.chankan}</Text>
              <Switch value={isKanWin} onValueChange={toggleKanWin}/>
            </View>
            
            <View style={styles.switchRow}>
              <Text style={styles.label}>{isTsumo ? t.haitei : t.houtei}</Text>
              <Switch value={isUnderTheSea} onValueChange={toggleUnderTheSea}/>
            </View>

            {/* RIICHI BLOCK (HIDDEN IF OPEN) */}
            {!hasOpenMeld && (
              <>
                <Text style={[styles.label, {marginTop: 15, marginBottom: 5}]}>{t.riichi}</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity onPress={() => handleRiichiChange('none')} style={[styles.segmentBtn, riichiStatus === 'none' && styles.segmentActive]}>
                    <Text style={riichiStatus === 'none' ? styles.segmentTextActive : styles.segmentText}>{t.none}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRiichiChange('riichi')} style={[styles.segmentBtn, riichiStatus === 'riichi' && styles.segmentActive]}>
                    <Text style={riichiStatus === 'riichi' ? styles.segmentTextActive : styles.segmentText}>{t.riichi}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRiichiChange('double')} style={[styles.segmentBtn, riichiStatus === 'double' && styles.segmentActive]}>
                    <Text style={riichiStatus === 'double' ? styles.segmentTextActive : styles.segmentText}>{t.wRiichi}</Text>
                  </TouchableOpacity>
                </View>

                {riichiStatus !== 'none' && (
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>{t.ippatsu}</Text>
                    <Switch value={isIppatsu} onValueChange={setIsIppatsu} />
                  </View>
                )}
              </>
            )}

            <View style={{ marginTop: 15 }}>
              <Text style={styles.label}>{t.dora}</Text>
              <View style={styles.doraRow}>
                {doraIndicators.map((tile, i) => (
                  <TouchableOpacity key={i} onPress={() => setDoraIndicators(prev => prev.filter((_, idx) => idx !== i))} style={styles.tileWrapper}>
                    <TileIcon name={tile} width={30} height={40} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => { setModalTarget('dora'); setShowAddTileModal(true); }} style={styles.addDoraBtn}>
                  <Text style={styles.addDoraText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {(!hasOpenMeld && riichiStatus !== 'none') && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>{t.uraDora}</Text>
                <View style={styles.doraRow}>
                  {uraDoraIndicators.map((tile, i) => (
                    <TouchableOpacity key={i} onPress={() => setUraDoraIndicators(prev => prev.filter((_, idx) => idx !== i))} style={styles.tileWrapper}>
                      <TileIcon name={tile} width={30} height={40} />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => { setModalTarget('uradora'); setShowAddTileModal(true); }} style={styles.addDoraBtn}>
                    <Text style={styles.addDoraText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={[styles.label, {marginTop: 20}]}>{t.seatWind}</Text>
            <View style={styles.windRow}>
              {['east', 'south', 'west', 'north'].map(w => (
                <TouchableOpacity key={w} style={[styles.windBtn, seatWind === w && styles.windBtnActive]} onPress={() => setSeatWind(w)}>
                  <Text style={seatWind === w ? styles.windTextActive : styles.windText}>{t.winds[w as keyof typeof t.winds].toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, {marginTop: 15}]}>{t.roundWind}</Text>
            <View style={styles.windRow}>
              {['east', 'south', 'west', 'north'].map(w => (
                <TouchableOpacity key={w} style={[styles.windBtn, roundWind === w && styles.windBtnActive]} onPress={() => setRoundWind(w)}>
                  <Text style={roundWind === w ? styles.windTextActive : styles.windText}>{t.winds[w as keyof typeof t.winds].toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[styles.button, { marginTop: 20, width: '100%', alignItems: 'center' }]} onPress={calculateScore} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t.calculating : t.calculateButton}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PHASE 4: RESULTS */}
      {step === 'result' && calcResult && (
        <View style={styles.editorContainer}>
          <Text style={[styles.title, { color: '#FFD700', fontSize: 36, textAlign: 'center' }]}>
            {/* NEW: Tsumo 'ALL' Check ensures Dealer Tsumo displays perfectly */}
            {isTsumo 
              ? (seatWind === 'east' || calcResult.additional_points === calcResult.points)
                ? `${calcResult.points} ${t.all}`
                : `${calcResult.additional_points} / ${calcResult.points} ${t.pts}`
              : `${calcResult.points} ${t.pts}`}
          </Text>
          <Text style={styles.resultTitle}>{renderHanFuOrYakuman()}</Text>
          
          <View style={styles.yakuBox}>
            {calcResult.yaku?.map((y: { name: string, han: string | number }, i: number) => (
              <View key={i} style={styles.yakuRow}>
                <Text style={styles.yakuText}>• {getTranslatedYaku(y.name, locale)}</Text>
                <Text style={styles.yakuText}>{formatHan(y.han, locale)}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, { marginTop: 30 }]} onPress={resetAndScanAnother}>
            <Text style={styles.buttonText}>{t.scanAnother}</Text>
          </TouchableOpacity>
        </View>
      )}

      <StatusBar style="light" />
    
      <Modal visible={showAddTileModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.resultTitle}>{t.selectTileToAdd}</Text>
            
            <ScrollView contentContainerStyle={styles.modalGrid}>
              {ALL_TILES.map((tile) => (
                <TouchableOpacity 
                  key={tile} 
                  style={styles.tileWrapper}
                  onPress={() => {
                    if (modalTarget === 'hand') {
                      setEditableClosedHand(prev => [...prev, tile]);
                    } else if (modalTarget === 'dora') {
                      setDoraIndicators(prev => [...prev, tile]);
                    } else if (modalTarget === 'uradora') {
                      setUraDoraIndicators(prev => [...prev, tile]);
                    }
                    setShowAddTileModal(false);
                  }}
                >
                  <TileIcon name={tile} width={40} height={55} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.button, { marginTop: 20, backgroundColor: '#d9534f' }]} onPress={() => setShowAddTileModal(false)}>
              <Text style={styles.buttonText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  langButton: { backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#555' },
  langButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  button: { backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subtext: { color: '#aaa', marginBottom: 10 },
  editorContainer: { width: '100%', alignItems: 'center' },
  resultTitle: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', backgroundColor: '#0a4a3c', padding: 10, borderRadius: 8, width: '100%' },
  tileWrapper: { margin: 2 },
  meldContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginTop: 10 },
  meldGroup: { flexDirection: 'row', backgroundColor: '#0a4a3c', padding: 5, borderRadius: 8 },
  goldenHighlight: { borderColor: '#FFD700', borderWidth: 3, borderRadius: 6, transform: [{ translateY: -10 }] },

  contextBox: { width: '100%', backgroundColor: '#2D2D2D', padding: 20, borderRadius: 10, marginTop: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { color: '#FFF', fontSize: 16, fontWeight: '600', maxWidth: '75%' },
  windRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  windBtn: { flex: 1, backgroundColor: '#444', paddingVertical: 10, marginHorizontal: 5, borderRadius: 6, alignItems: 'center' },
  windBtnActive: { backgroundColor: '#4CAF50' },
  windText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  windTextActive: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  yakuBox: { backgroundColor: '#2D2D2D', padding: 20, borderRadius: 10, marginTop: 20, width: '100%' },
  yakuRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  yakuText: { color: '#D4D4D4', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  modalContent: { width: '95%', height: '80%', backgroundColor: '#1E1E1E', borderRadius: 15, padding: 20, alignItems: 'center' },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, paddingBottom: 30 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#444', borderRadius: 8, padding: 4, marginBottom: 15 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: '#4CAF50' },
  segmentText: { color: '#aaa', fontWeight: 'bold' },
  segmentTextActive: { color: '#FFF', fontWeight: 'bold' },
  
  counterBtn: { fontSize: 24, color: '#4CAF50', fontWeight: 'bold', paddingHorizontal: 10 },
  doraRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, alignItems: 'center' },
  addDoraBtn: { width: 30, height: 40, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center', borderRadius: 4, marginLeft: 5 },
  addDoraText: { color: '#aaa', fontSize: 20, fontWeight: 'bold' },

  // Camera Styles
  cameraContainer: { width: '100%', height: 600, borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  camera: { flex: 1, justifyContent: 'space-between' },
  overlayContainer: { flex: 1, flexDirection: 'row' }, 
  overlayHalf: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  overlayDivider: { width: 2, backgroundColor: '#FFD700', borderStyle: 'dashed' },
  overlayText: { color: '#FFF', fontSize: 24, fontWeight: 'bold', transform: [{ rotate: '90deg' }], opacity: 0.7 },
  cameraControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  shutterBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#000' },
  closeCamBtn: { backgroundColor: '#d9534f', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
});