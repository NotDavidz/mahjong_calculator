import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { TileIcon } from '@/components/tileIcon';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ALL_TILES = [
  '1m',
  '2m',
  '3m',
  '4m',
  '5m',
  '0m',
  '6m',
  '7m',
  '8m',
  '9m',
  '1p',
  '2p',
  '3p',
  '4p',
  '5p',
  '0p',
  '6p',
  '7p',
  '8p',
  '9p',
  '1s',
  '2s',
  '3s',
  '4s',
  '5s',
  '0s',
  '6s',
  '7s',
  '8s',
  '9s',
  'ton',
  'nan',
  'shaa',
  'pei',
  'haku',
  'hatsu',
  'chun',
];

// --- LOCALIZATION DICTIONARIES ---
const translations = {
  en: {
    title: 'Mahjong Calculator',
    scanButton: 'Scan Hand',
    analyzing: 'Analyzing...',
    confirmHand: 'Confirm Closed Hand',
    subtext: 'Tap a tile to delete it.',
    confirmMelds: 'Confirm Open Melds',
    confirmButton: 'Confirm Hand',
    winningTilePrompt: 'Tap Your Winning Tile!',
    tsumo: 'Tsumo',
    ron: 'Ron',
    honba: 'Honba (Sticks)',
    rinshan: 'Rinshan Kaihou (Win off Replacement)',
    chankan: 'Chankan (Robbing a Kan)',
    haitei: 'Haitei Raoyue (Under the Sea)',
    houtei: 'Houtei Raoyui (Under the River)',
    tenhou: 'Tenhou (Blessing of Heaven)',
    chiho: 'Chiihou (Blessing of Earth)',
    renhou: 'Renhou (Blessing of Man)',
    riichi: 'Riichi',
    wRiichi: 'W-Riichi',
    none: 'None',
    ippatsu: 'Ippatsu',
    dora: 'Dora Indicators',
    uraDora: 'Ura Dora Indicators',
    seatWind: 'Seat Wind',
    roundWind: 'Round Wind',
    calculateButton: 'Calculate Score',
    calculating: 'Calculating...',
    scanAnother: 'Scan Another Hand',
    selectTileToAdd: 'Select Tile to Add',
    cancel: 'Cancel',
    pts: 'pts',
    all: 'ALL',
    han: 'Han',
    fu: 'fu',
    mangan: 'Mangan',
    haneman: 'Haneman',
    baiman: 'Baiman',
    sanbaiman: 'Sanbaiman',
    yakuman: 'Yakuman',
    doubleYakuman: 'Double Yakuman',
    tripleYakuman: 'Triple Yakuman',
    quadYakuman: 'Quadruple Yakuman',
    quinYakuman: 'Quintuple Yakuman',
    sexYakuman: 'Sextuple Yakuman',
    countedYakuman: 'Counted Yakuman',
    winds: {
      east: 'East',
      south: 'South',
      west: 'West',
      north: 'North',
    },
    meldTypes: {
      pon: 'PON',
      chi: 'CHI',
      kan: 'KAN',
      ankan: 'ANKAN',
    },
  },
  zh: {
    title: '日麻计分器',
    scanButton: '扫描手牌',
    analyzing: '分析中...',
    confirmHand: '确认门前手牌',
    subtext: '点击麻将即可删除误识别的牌。',
    confirmMelds: '确认副露',
    confirmButton: '确认手牌',
    winningTilePrompt: '请点击你的和牌！',
    tsumo: '自摸',
    ron: '荣和',
    honba: '本场',
    rinshan: '岭上开花',
    chankan: '枪杠',
    haitei: '海底捞月',
    houtei: '河底摸鱼',
    tenhou: '天和',
    chiho: '地和',
    renhou: '人和',
    riichi: '立直',
    wRiichi: '两立直',
    none: '无',
    ippatsu: '一发',
    dora: '宝牌指示牌',
    uraDora: '里宝牌指示牌',
    seatWind: '自风',
    roundWind: '场风',
    calculateButton: '计算得分',
    calculating: '计算中...',
    scanAnother: '扫描下一手牌',
    selectTileToAdd: '选择要添加的牌',
    cancel: '取消',
    pts: '点',
    all: 'ALL',
    han: '番',
    fu: '符',
    mangan: '满贯',
    haneman: '跳满',
    baiman: '倍满',
    sanbaiman: '三倍满',
    yakuman: '役满',
    doubleYakuman: '两倍役满',
    tripleYakuman: '三倍役满',
    quadYakuman: '四倍役满',
    quinYakuman: '五倍役满',
    sexYakuman: '六倍役满',
    countedYakuman: '累计役满',
    winds: {
      east: '东',
      south: '南',
      west: '西',
      north: '北',
    },
    meldTypes: {
      pon: '碰',
      chi: '吃',
      kan: '明杠',
      ankan: '暗杠',
    },
  },
};

const yakuTranslations: Record<string, { en: string; zh: string }> = {
  Riichi: { en: 'Riichi', zh: '立直' },
  'Menzen Tsumo': {
    en: 'Concealed Self-Draw (Tsumo)',
    zh: '门前清自摸和',
  },
  Tanyao: { en: 'All Simples (Tanyao)', zh: '断幺九' },
  Pinfu: { en: 'Pinfu', zh: '平和' },
  Iipeikou: { en: 'Pure Double Sequence (Iipeikou)', zh: '一杯口' },
  Ippatsu: { en: 'Ippatsu', zh: '一发' },
  'Haitei Raoyue': { en: 'Under the Sea (Haitei)', zh: '海底捞月' },
  'Houtei Raoyui': { en: 'Under the River (Houtei)', zh: '河底摸鱼' },
  'Rinshan Kaihou': { en: 'After a Kan (Rinshan)', zh: '岭上开花' },
  Chankan: { en: 'Robbing a Kan (Chankan)', zh: '枪杠' },
  'Double Riichi': { en: 'Double Riichi', zh: '两立直' },
  'Sanshoku Doujun': {
    en: 'Three-Suited Straight (Sanshoku)',
    zh: '三色同顺',
  },
  'Sanshoku Doukou': {
    en: 'Three-Suited Triplets',
    zh: '三色同刻',
  },
  'San ankou': {
    en: 'Three Concealed Triplets (Sanankou)',
    zh: '三暗刻',
  },
  Ikkitsuukan: { en: 'Full Straight (Ittsuu)', zh: '一气贯通' },
  Chiitoitsu: { en: 'Seven Pairs (Chiitoitsu)', zh: '七对子' },
  Toitoi: { en: 'All Triplets (Toitoi)', zh: '对对和' },
  Chantai: { en: 'Mixed Outside Hand (Chanta)', zh: '混全带幺九' },
  'San kantsu': { en: 'Three Kans (Sankantsu)', zh: '三杠子' },
  Shousangen: {
    en: 'Little Three Dragons (Shousangen)',
    zh: '小三元',
  },
  Honroutou: {
    en: 'All Terminals and Honors (Honroutou)',
    zh: '混老头',
  },
  Ryanpeikou: {
    en: 'Twice Pure Double Sequence (Ryanpeikou)',
    zh: '二杯口',
  },
  Junchan: { en: 'Pure Outside Hand (Junchan)', zh: '纯全带幺九' },
  Honitsu: { en: 'Half Flush (Honitsu)', zh: '混一色' },
  Chinitsu: { en: 'Full Flush (Chinitsu)', zh: '清一色' },
  Dora: { en: 'Dora', zh: '宝牌' },
  'Aka Dora': { en: 'Red Five (Aka Dora)', zh: '赤宝牌' },
  'Ura Dora': { en: 'Ura Dora', zh: '里宝牌' },
  'Yakuhai (seat wind east)': {
    en: 'Seat Wind (East)',
    zh: '自风：东',
  },
  'Yakuhai (seat wind south)': {
    en: 'Seat Wind (South)',
    zh: '自风：南',
  },
  'Yakuhai (seat wind west)': {
    en: 'Seat Wind (West)',
    zh: '自风：西',
  },
  'Yakuhai (seat wind north)': {
    en: 'Seat Wind (North)',
    zh: '自风：北',
  },
  'Yakuhai (round wind east)': {
    en: 'Round Wind (East)',
    zh: '场风：东',
  },
  'Yakuhai (round wind south)': {
    en: 'Round Wind (South)',
    zh: '场风：南',
  },
  'Yakuhai (round wind west)': {
    en: 'Round Wind (West)',
    zh: '场风：西',
  },
  'Yakuhai (round wind north)': {
    en: 'Round Wind (North)',
    zh: '场风：北',
  },
  'Yakuhai (haku)': {
    en: 'White Dragon (Haku)',
    zh: '役牌：白',
  },
  'Yakuhai (hatsu)': {
    en: 'Green Dragon (Hatsu)',
    zh: '役牌：发',
  },
  'Yakuhai (chun)': {
    en: 'Red Dragon (Chun)',
    zh: '役牌：中',
  },
  'Kokushi Musou': {
    en: 'Thirteen Orphans (Kokushi Musou)',
    zh: '国士无双',
  },
  'Kokushi musou juusanmen matchi': {
    en: 'Thirteen Orphans (13-wait)',
    zh: '国士无双十三面',
  },
  'Suu ankou': {
    en: 'Four Concealed Triplets (Suuankou)',
    zh: '四暗刻',
  },
  'Suu ankou tanki': {
    en: 'Four Concealed Triplets (Single Wait)',
    zh: '四暗刻单骑',
  },
  Daisangen: {
    en: 'Big Three Dragons (Daisangen)',
    zh: '大三元',
  },
  'Tsuu iisou': { en: 'All Honors (Tsuuiisou)', zh: '字一色' },
  Ryuuiisou: { en: 'All Green (Ryuuiisou)', zh: '绿一色' },
  Chinroutou: {
    en: 'All Terminals (Chinroutou)',
    zh: '清老头',
  },
  'Suu kantsu': {
    en: 'Four Kans (Suukantsu)',
    zh: '四杠子',
  },
  'Shou suushii': {
    en: 'Little Four Winds (Shousuushii)',
    zh: '小四喜',
  },
  'Dai suushii': {
    en: 'Big Four Winds (Daisuushii)',
    zh: '大四喜',
  },
  'Chuuren Poutou': {
    en: 'Nine Gates (Chuuren Poutou)',
    zh: '九莲宝灯',
  },
  'Daburu chuuren poutou': {
    en: 'True Nine Gates',
    zh: '纯正九莲宝灯',
  },
  Tenhou: {
    en: 'Blessing of Heaven (Tenhou)',
    zh: '天和',
  },
  Chiihou: {
    en: 'Blessing of Earth (Chiho)',
    zh: '地和',
  },
  Renhou: {
    en: 'Blessing of Man (Renhou)',
    zh: '人和',
  },
};

const getTranslatedYaku = (
  yakuName: string,
  locale: 'en' | 'zh'
) => {
  if (yakuTranslations[yakuName]) {
    return yakuTranslations[yakuName][locale];
  }

  const lowerName = yakuName.toLowerCase();
  const matchKey = Object.keys(yakuTranslations).find(
    k => k.toLowerCase() === lowerName
  );

  if (matchKey) {
    return yakuTranslations[matchKey][locale];
  }

  return yakuName;
};

const formatHan = (
  han: number | string,
  locale: 'en' | 'zh'
) => {
  if (han === 'Yakuman') {
    return locale === 'zh' ? '役满' : 'Yakuman';
  }

  return locale === 'zh' ? `${han} 番` : `${han} Han`;
};

export default function IndexScreen() {
  const [locale, setLocale] = useState<'en' | 'zh'>('en');
  const t = translations[locale];

  const [step, setStep] = useState<
    'upload' | 'camera' | 'edit' | 'context' | 'result'
  >('upload');

  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] =
    useCameraPermissions();

  const cameraRef = useRef<any>(null);

  // --- Smooth Transition Helper ---
  const changeStep = (newStep: typeof step) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut
    );
    setStep(newStep);
  };

  const [showAddTileModal, setShowAddTileModal] =
    useState(false);
  const [editableClosedHand, setEditableClosedHand] =
    useState<string[]>([]);
  const [editableMelds, setEditableMelds] =
    useState<any[]>([]);

  const [winTileIndex, setWinTileIndex] =
    useState<number | null>(null);

  const [isTsumo, setIsTsumo] = useState(false);
  const [riichiStatus, setRiichiStatus] =
    useState<'none' | 'riichi' | 'double'>('none');

  const [isIppatsu, setIsIppatsu] = useState(false);
  const [isUnderTheSea, setIsUnderTheSea] =
    useState(false);
  const [isKanWin, setIsKanWin] = useState(false);
  const [isFirstTurnWin, setIsFirstTurnWin] =
    useState(false);

  const [seatWind, setSeatWind] = useState('east');
  const [roundWind, setRoundWind] = useState('east');

  const [honba, setHonba] = useState<number>(0);
  const [doraIndicators, setDoraIndicators] =
    useState<string[]>([]);
  const [uraDoraIndicators, setUraDoraIndicators] =
    useState<string[]>([]);

  const [modalTarget, setModalTarget] = useState<
    'hand' | 'dora' | 'uradora' | 'meld'
  >('hand');

  const [newMeldType, setNewMeldType] =
    useState<'pon' | 'chi' | 'kan' | 'ankan'>('pon');

  const [redFivePrompt, setRedFivePrompt] =
    useState<string | null>(null);

  const [calcResult, setCalcResult] =
    useState<any>(null);

  const hasOpenMeld = editableMelds.some(
    m => m.is_open
  );

  const handleRiichiChange = (
    val: 'none' | 'riichi' | 'double'
  ) => {
    setRiichiStatus(val);

    if (val === 'none') {
      setIsIppatsu(false);
      setUraDoraIndicators([]);
    }
  };

  const toggleKanWin = (val: boolean) => {
    setIsKanWin(val);

    if (val) {
      setIsUnderTheSea(false);
    }
  };

  const toggleUnderTheSea = (val: boolean) => {
    setIsUnderTheSea(val);

    if (val) {
      setIsKanWin(false);
    }
  };

  const removeTile = (indexToRemove: number) => {
    setEditableClosedHand(prev =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const removeMeld = (indexToRemove: number) => {
    setEditableMelds(prev =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const finalizeMeld = (
    tilesStr: string,
    suit: string,
    meldType: string
  ) => {
    const apiMeldType =
      meldType === 'ankan' ? 'kan' : meldType;

    const isOpen = meldType !== 'ankan';

    setEditableMelds(prev => [
      ...prev,
      {
        meld_type: apiMeldType,
        suit,
        tiles: tilesStr,
        is_open: isOpen,
      },
    ]);

    setRedFivePrompt(null);
    setShowAddTileModal(false);
  };

  const handleAddManualMeld = (
    selectedTile: string
  ) => {
    let suit = '';

    if (HONOR_MAP[selectedTile]) {
      suit = 'honors';

      if (newMeldType === 'chi') {
        alert(
          locale === 'zh'
            ? '字牌不能吃'
            : 'Cannot Chi honors'
        );
        return;
      }
    } else {
      suit =
        selectedTile[1] === 'm'
          ? 'man'
          : selectedTile[1] === 'p'
          ? 'pin'
          : 'sou';
    }

    const valStr = HONOR_MAP[selectedTile]
      ? HONOR_MAP[selectedTile]
      : selectedTile[0];

    const baseVal =
      valStr === '0' ? 5 : parseInt(valStr);

    const suitChar = selectedTile[1];

    if (newMeldType === 'chi') {
      if (valStr === '0') {
        setRedFivePrompt(suitChar);
        return;
      }

      if (baseVal > 7) {
        alert(
          locale === 'zh'
            ? '无效的吃'
            : 'Invalid Chi starting tile'
        );
        return;
      }

      finalizeMeld(
        `${valStr}${baseVal + 1}${baseVal + 2}`,
        suit,
        newMeldType
      );
    } else if (newMeldType === 'pon') {
      finalizeMeld(
        `${valStr}${baseVal}${baseVal}`,
        suit,
        newMeldType
      );
    } else {
      finalizeMeld(
        `${valStr}${baseVal}${baseVal}${baseVal}`,
        suit,
        newMeldType
      );
    }
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
    setRedFivePrompt(null);
    changeStep('upload');
  };

  const HONOR_MAP: Record<string, string> = {
    ton: '1',
    nan: '2',
    shaa: '3',
    pei: '4',
    haku: '5',
    hatsu: '6',
    chun: '7',
  };

  const getYoloNamesFromMeld = (meld: any) => {
    const honorReverseMap: Record<string, string> = {
      '1': 'ton',
      '2': 'nan',
      '3': 'shaa',
      '4': 'pei',
      '5': 'haku',
      '6': 'hatsu',
      '7': 'chun',
    };

    const tiles = meld.tiles
      .split('')
      .map((char: string) => {
        if (meld.suit === 'honors') {
          return honorReverseMap[char];
        }

        const suitChar =
          meld.suit === 'man'
            ? 'm'
            : meld.suit === 'pin'
            ? 'p'
            : 's';

        return `${char}${suitChar}`;
      });

    if (!meld.is_open && tiles.length === 4) {
      return [
        'back',
        tiles[1],
        tiles[2],
        'back',
      ];
    }

    return tiles;
  };

  const translateToMahjong = (
    yoloTiles: string[]
  ) => {
    const suits = {
      m: '',
      p: '',
      s: '',
      z: '',
    };

    yoloTiles.forEach(tile => {
      if (tile === 'back') return;

      if (HONOR_MAP[tile]) {
        suits.z += HONOR_MAP[tile];
      } else {
        suits[tile[1] as keyof typeof suits] +=
          tile[0];
      }
    });

    suits.m = suits.m
      .split('')
      .sort()
      .join('');

    suits.p = suits.p
      .split('')
      .sort()
      .join('');

    suits.s = suits.s
      .split('')
      .sort()
      .join('');

    suits.z = suits.z
      .split('')
      .sort()
      .join('');

    return suits;
  };

  const calculateScore = async () => {
    if (winTileIndex === null) {
      alert(
        locale === 'zh'
          ? '请点击你的胡牌！'
          : 'Please tap your winning tile before calculating!'
      );
      return;
    }

    setLoading(true);

    const allHandTiles = [...editableClosedHand];

    editableMelds.forEach(meld => {
      const honorRev: Record<string, string> = {
        '1': 'ton',
        '2': 'nan',
        '3': 'shaa',
        '4': 'pei',
        '5': 'haku',
        '6': 'hatsu',
        '7': 'chun',
      };

      const rawTiles = meld.tiles
        .split('')
        .map((char: string) => {
          if (meld.suit === 'honors') {
            return honorRev[char];
          }

          return `${char}${
            meld.suit === 'man'
              ? 'm'
              : meld.suit === 'pin'
              ? 'p'
              : 's'
          }`;
        });

      allHandTiles.push(...rawTiles);
    });

    const parsedHand =
      translateToMahjong(allHandTiles);

    const winningTile =
      editableClosedHand[winTileIndex];

    let winValue = '';
    let winSuit = '';

    if (HONOR_MAP[winningTile]) {
      winValue = HONOR_MAP[winningTile];
      winSuit = 'honors';
    } else {
      winValue = winningTile[0];

      winSuit =
        winningTile[1] === 'm'
          ? 'man'
          : winningTile[1] === 'p'
          ? 'pin'
          : 'sou';
    }

    const formatDora = (tiles: string[]) =>
      tiles.map(t => {
        if (HONOR_MAP[t]) {
          return `${HONOR_MAP[t]}z`;
        }

        if (t[0] === '0') {
          return `5${t[1]}`;
        }

        return t;
      });

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
      dora_indicators:
        formatDora(doraIndicators),
      ura_dora_indicators:
        formatDora(uraDoraIndicators),
      melds: editableMelds,
    };

    try {
      const response = await fetch(
        'https://pavos-riichi-calculator.onrender.com/calculate',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Calculation failed');
      }

      const data = await response.json();

      if (data.status === 'error') {
        alert(
          `${
            locale === 'zh'
              ? '无效手牌'
              : 'Invalid Hand'
          }: ${data.message}`
        );
        return;
      }

      setCalcResult(data);
      changeStep('result');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

 const pickAndAnalyzeImage = async () => {
  const result =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

  if (!result.canceled) {
    setLoading(true);

    try {
      const manipulatedImg =
        await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [
            { resize: { width: 1080 } },
          ],
          {
            compress: 0.9,
            format:
              ImageManipulator.SaveFormat.JPEG,
          }
        );

      console.log('GALLERY ORIGINAL:', {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
      });

      console.log('GALLERY PROCESSED:', {
        uri: manipulatedImg.uri,
        width: manipulatedImg.width,
        height: manipulatedImg.height,
      });

      await sendImageToBackend(
        manipulatedImg.uri
      );
    } catch (e) {
      console.error('GALLERY ERROR:', e);
      setLoading(false);
    }
  }
};

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        alert(
          locale === 'zh'
            ? '需要相机权限才能扫描麻将手牌。'
            : 'Camera permission is required to scan a Mahjong hand.'
        );
        return;
      }
    }

    changeStep('camera');
  };

 const takePictureAndProcess = async () => {
  if (!cameraRef.current) return;

  setLoading(true);

  try {
    const photo =
      await cameraRef.current.takePictureAsync({
        quality: 1,
      });

    console.log('CAMERA ORIGINAL:', {
      uri: photo.uri,
      width: photo.width,
      height: photo.height,
    });

    const manipulatedImg =
      await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          { resize: { width: 1080 } },
        ],
        {
          compress: 0.9,
          format:
            ImageManipulator.SaveFormat.JPEG,
        }
      );

    console.log('CAMERA PROCESSED:', {
      uri: manipulatedImg.uri,
      width: manipulatedImg.width,
      height: manipulatedImg.height,
    });

    const { status } =
      await requestPermissionsAsync(true);

    if (status !== 'granted') {
      throw new Error(
        locale === 'zh'
          ? '需要照片图库权限才能保存图片。'
          : 'Photo library permission is required to save the image.'
      );
    }

    await Asset.create(manipulatedImg.uri);

    await sendImageToBackend(
      manipulatedImg.uri
    );
  } catch (e) {
    console.error('CAMERA ERROR:', e);

    alert(
      locale === 'zh'
        ? `拍照/上传失败: ${String(e)}`
        : `Capture/Upload Error: ${String(e)}`
    );
  } finally {
    setLoading(false);
  }
};

  const sendImageToBackend = async (
    uri: string
  ) => {
    setLoading(true);

    try {
      const file = new File(uri);

      const response = await file.upload(
        'https://pavos-riichi-calculator.onrender.com/analyze-image',
        {
          httpMethod: 'POST',
          uploadType: UploadType.MULTIPART,
          fieldName: 'file',
          mimeType: 'image/jpeg',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (
        response.status < 200 ||
        response.status >= 300
      ) {
        throw new Error(
          `Backend error ${response.status}: ${response.body}`
        );
      }

      const data = JSON.parse(response.body);

      if (data.status === 'error') {
        alert(
          `${
            locale === 'zh'
              ? '无效手牌'
              : 'Invalid Hand'
          }: ${data.message}`
        );
        return;
      }

      if (data.status === 'success') {
        setEditableClosedHand(
          data.closed_hand_raw
        );

        setEditableMelds(
          data.meld_options &&
            data.meld_options.length > 0
            ? data.meld_options[0]
            : []
        );

        changeStep('edit');
      }
    } catch (error: any) {
      alert(
        locale === 'zh'
          ? `上传失败: ${error.message}`
          : `Failed to upload image: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const renderHanFuOrYakuman = () => {
    const yakumanCount =
      calcResult?.yaku?.filter(
        (y: {
          name: string;
          han: string | number;
        }) => y.han === 'Yakuman'
      ).length || 0;

    if (yakumanCount === 1) {
      return t.yakuman;
    }

    if (yakumanCount === 2) {
      return t.doubleYakuman;
    }

    if (yakumanCount === 3) {
      return t.tripleYakuman;
    }

    if (yakumanCount === 4) {
      return t.quadYakuman;
    }

    if (yakumanCount === 5) {
      return t.quinYakuman;
    }

    if (yakumanCount === 6) {
      return t.sexYakuman;
    }

    if (yakumanCount >= 7) {
      return `${yakumanCount}x ${t.yakuman}`;
    }

    if (calcResult?.han >= 13) {
      return t.countedYakuman;
    }

    return (
      <Text>
        {calcResult?.han}
        {t.han}{' '}
        <Text style={{ opacity: 0.6 }}>
          {calcResult?.fu}
          {t.fu}
        </Text>
      </Text>
    );
  };

  // --- DYNAMIC TIER EFFECTS ENGINE ---
  const scoreTier = calcResult
    ? (() => {
        const yakumanCount =
          calcResult.yaku?.filter(
            (y: any) =>
              y.han === 'Yakuman'
          ).length || 0;

        const han = calcResult.han;
        const fu = calcResult.fu;

        if (
          yakumanCount > 0 ||
          han >= 13
        ) {
          return 'yakuman';
        }

        if (han >= 11) {
          return 'sanbaiman';
        }

        if (han >= 8) {
          return 'baiman';
        }

        if (han >= 6) {
          return 'haneman';
        }

        if (
          han === 5 ||
          (han === 4 && fu >= 40) ||
          (han === 3 && fu >= 70)
        ) {
          return 'mangan';
        }

        return 'normal';
      })()
    : 'normal';

  const getTierConfig = (tier: string) => {
    const yakumanCount =
      calcResult?.yaku?.filter(
        (y: any) =>
          y.han === 'Yakuman'
      ).length || 0;

    let yakumanLabel = t.yakuman;

    if (yakumanCount === 2) {
      yakumanLabel = t.doubleYakuman;
    }

    if (yakumanCount === 3) {
      yakumanLabel = t.tripleYakuman;
    }

    if (yakumanCount === 4) {
      yakumanLabel = t.quadYakuman;
    }

    if (yakumanCount === 5) {
      yakumanLabel = t.quinYakuman;
    }

    if (yakumanCount === 6) {
      yakumanLabel = t.sexYakuman;
    }

    if (yakumanCount >= 7) {
      yakumanLabel = `${yakumanCount}x ${t.yakuman}`;
    }

    if (
      calcResult?.han >= 13 &&
      yakumanCount === 0
    ) {
      yakumanLabel = t.countedYakuman;
    }

    switch (tier) {
      case 'yakuman':
        return {
          color: '#cf3838',
          label: yakumanLabel,
        };

      case 'sanbaiman':
        return {
          color: '#7c4dd3',
          shadow:
            'rgba(236, 72, 153, 0.7)',
          label: t.sanbaiman,
        };

      case 'baiman':
        return {
          color: '#2da5c9',
          shadow:
            'rgba(239, 68, 68, 0.7)',
          label: t.baiman,
        };

      case 'haneman':
        return {
          color: '#61c58e',
          shadow:
            'rgba(59, 130, 246, 0.7)',
          label: t.haneman,
        };

      case 'mangan':
        return {
          color: '#8ab446',
          label: t.mangan,
        };

      default:
        return {
          color: '#ebc481',
          shadow:
            'rgba(245, 158, 11, 0.4)',
          label: null,
        };
    }
  };

  const tierConfig = getTierConfig(
    scoreTier
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      {/* LANGUAGE TOGGLE HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {t.title}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.langButton}
          onPress={() =>
            setLocale(prev =>
              prev === 'en' ? 'zh' : 'en'
            )
          }
        >
          <Text style={styles.langButtonText}>
            {locale === 'en' ? '中文' : 'EN'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PHASE 1: UPLOAD OR CAMERA */}
      {step === 'upload' && (
        <View
          style={{
            alignItems: 'center',
            width: '100%',
            marginTop: 60,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.primaryButton,
              { marginBottom: 20 },
            ]}
            onPress={openCamera}
            disabled={loading}
          >
            <Text
              style={styles.primaryButtonText}
            >
              {loading
                ? t.analyzing
                : `${t.scanButton} (Camera)`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.secondaryButton}
            onPress={pickAndAnalyzeImage}
            disabled={loading}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              {locale === 'zh'
                ? '从相册上传'
                : 'Upload from Gallery'}
            </Text>
          </TouchableOpacity>

          {loading && (
            <ActivityIndicator
              size="large"
              color="#10B981"
              style={{ marginTop: 40 }}
            />
          )}
        </View>
      )}

      {/* PHASE 1.5: CUSTOM CAMERA */}
      {step === 'camera' && (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            ref={cameraRef}
            facing="back"
            autofocus="on"
          />

          <View
            style={styles.overlayContainer}
          >
            <View
              style={styles.overlayHalf}
            >
              <Text
                style={styles.overlayText}
              >
                {locale === 'zh'
                  ? '副露'
                  : 'Melds'}
              </Text>
            </View>

            <View
              style={styles.overlayDivider}
            />

            <View
              style={styles.overlayHalf}
            >
              <Text
                style={styles.overlayText}
              >
                {locale === 'zh'
                  ? '门前手牌'
                  : 'Concealed Hand'}
              </Text>
            </View>
          </View>

          <View
            style={styles.cameraControls}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeCamBtn}
              onPress={() =>
                changeStep('upload')
              }
              disabled={loading}
            >
              <Text
                style={styles.closeCamText}
              >
                {t.cancel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.shutterBtn}
              onPress={
                takePictureAndProcess
              }
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#10B981"
                />
              ) : (
                <View
                  style={styles.shutterInner}
                />
              )}
            </TouchableOpacity>

            <View
              style={{ width: 60 }}
            />
          </View>
        </View>
      )}

      {/* PHASE 2: EDIT HAND */}
      {step === 'edit' && (
        <View
          style={styles.editorContainer}
        >
          <Text style={styles.resultTitle}>
            {t.confirmHand}
          </Text>

          <Text style={styles.subtext}>
            {t.subtext}
          </Text>

          <View style={styles.tileGrid}>
            {editableClosedHand.map(
              (tileName, index) => (
                <TouchableOpacity
                  activeOpacity={0.6}
                  key={index}
                  onPress={() =>
                    removeTile(index)
                  }
                  style={styles.tileWrapper}
                >
                  <TileIcon
                    name={tileName}
                  />
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setModalTarget('hand');
                setShowAddTileModal(true);
              }}
              style={styles.addTileBtn}
            >
              <Text
                style={
                  styles.addTileBtnText
                }
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.resultTitle,
              { marginTop: 30 },
            ]}
          >
            {t.confirmMelds}
          </Text>

          <Text style={styles.subtext}>
            {locale === 'zh'
              ? '点击副露即可删除'
              : 'Tap a meld to delete it.'}
          </Text>

          <View style={styles.meldContainer}>
            {editableMelds.map(
              (meld, mIdx) => (
                <TouchableOpacity
                  activeOpacity={0.6}
                  key={mIdx}
                  style={styles.meldGroup}
                  onPress={() =>
                    removeMeld(mIdx)
                  }
                >
                  {getYoloNamesFromMeld(
                    meld
                  ).map(
                    (
                      tileName: string,
                      tIdx: number
                    ) => (
                      <View
                        key={tIdx}
                        style={
                          styles.tileWrapper
                        }
                      >
                        <TileIcon
                          name={tileName}
                        />
                      </View>
                    )
                  )}
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.addMeldBtn}
              onPress={() => {
                setModalTarget('meld');
                setShowAddTileModal(true);
              }}
            >
              <Text
                style={
                  styles.addTileBtnText
                }
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={styles.navigationRow}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.backButton}
              onPress={
                resetAndScanAnother
              }
            >
              <Text
                style={
                  styles.backButtonText
                }
              >
                {locale === 'zh'
                  ? '返回'
                  : 'Back'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.nextButton}
              onPress={() =>
                changeStep('context')
              }
            >
              <Text
                style={
                  styles.nextButtonText
                }
              >
                {t.confirmButton}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PHASE 3: GAME CONTEXT */}
      {step === 'context' && (
        <View
          style={styles.editorContainer}
        >
          <Text style={styles.resultTitle}>
            {t.winningTilePrompt}
          </Text>

          <View
            style={[
              styles.tileGrid,
              {
                backgroundColor:
                  'transparent',
                borderColor:
                  'transparent',
                padding: 0,
              },
            ]}
          >
            {editableClosedHand.map(
              (tileName, index) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={index}
                  onPress={() =>
                    setWinTileIndex(index)
                  }
                  style={[
                    styles.tileWrapper,
                    winTileIndex ===
                      index &&
                      styles.goldenHighlight,
                  ]}
                >
                  <TileIcon
                    name={tileName}
                  />
                </TouchableOpacity>
              )
            )}
          </View>

          <View style={styles.cardBox}>
            <View
              style={
                styles.segmentedControl
              }
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  setIsTsumo(true)
                }
                style={[
                  styles.segmentBtn,
                  isTsumo &&
                    styles.segmentActive,
                ]}
              >
                <Text
                  style={
                    isTsumo
                      ? styles.segmentTextActive
                      : styles.segmentText
                  }
                >
                  {t.tsumo}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  setIsTsumo(false)
                }
                style={[
                  styles.segmentBtn,
                  !isTsumo &&
                    styles.segmentActive,
                ]}
              >
                <Text
                  style={
                    !isTsumo
                      ? styles.segmentTextActive
                      : styles.segmentText
                  }
                >
                  {t.ron}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.switchRow,
                { marginTop: 20 },
              ]}
            >
              <Text style={styles.label}>
                {t.honba}
              </Text>

              <View
                style={styles.counterBox}
              >
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() =>
                    setHonba(
                      Math.max(
                        0,
                        honba - 1
                      )
                    )
                  }
                >
                  <Text
                    style={
                      styles.counterBtn
                    }
                  >
                    -
                  </Text>
                </TouchableOpacity>

                <Text
                  style={
                    styles.counterValue
                  }
                >
                  {honba}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() =>
                    setHonba(
                      honba + 1
                    )
                  }
                >
                  <Text
                    style={
                      styles.counterBtn
                    }
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!hasOpenMeld && (
              <View
                style={styles.switchRow}
              >
                <Text
                  style={styles.label}
                >
                  {isTsumo
                    ? seatWind ===
                      'east'
                      ? t.tenhou
                      : t.chiho
                    : t.renhou}
                </Text>

                <Switch
                  value={
                    isFirstTurnWin
                  }
                  onValueChange={
                    setIsFirstTurnWin
                  }
                  trackColor={{
                    true: '#10B981',
                    false: '#334155',
                  }}
                />
              </View>
            )}

            <View
              style={styles.switchRow}
            >
              <Text style={styles.label}>
                {isTsumo
                  ? t.rinshan
                  : t.chankan}
              </Text>

              <Switch
                value={isKanWin}
                onValueChange={
                  toggleKanWin
                }
                trackColor={{
                  true: '#10B981',
                  false: '#334155',
                }}
              />
            </View>

            <View
              style={styles.switchRow}
            >
              <Text style={styles.label}>
                {isTsumo
                  ? t.haitei
                  : t.houtei}
              </Text>

              <Switch
                value={
                  isUnderTheSea
                }
                onValueChange={
                  toggleUnderTheSea
                }
                trackColor={{
                  true: '#10B981',
                  false: '#334155',
                }}
              />
            </View>

            {!hasOpenMeld && (
              <>
                <Text
                  style={[
                    styles.sectionLabel,
                    { marginTop: 15 },
                  ]}
                >
                  {t.riichi}
                </Text>

                <View
                  style={
                    styles.segmentedControl
                  }
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      handleRiichiChange(
                        'none'
                      )
                    }
                    style={[
                      styles.segmentBtn,
                      riichiStatus ===
                        'none' &&
                        styles.segmentActive,
                    ]}
                  >
                    <Text
                      style={
                        riichiStatus ===
                        'none'
                          ? styles.segmentTextActive
                          : styles.segmentText
                      }
                    >
                      {t.none}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      handleRiichiChange(
                        'riichi'
                      )
                    }
                    style={[
                      styles.segmentBtn,
                      riichiStatus ===
                        'riichi' &&
                        styles.segmentActive,
                    ]}
                  >
                    <Text
                      style={
                        riichiStatus ===
                        'riichi'
                          ? styles.segmentTextActive
                          : styles.segmentText
                      }
                    >
                      {t.riichi}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      handleRiichiChange(
                        'double'
                      )
                    }
                    style={[
                      styles.segmentBtn,
                      riichiStatus ===
                        'double' &&
                        styles.segmentActive,
                    ]}
                  >
                    <Text
                      style={
                        riichiStatus ===
                        'double'
                          ? styles.segmentTextActive
                          : styles.segmentText
                      }
                    >
                      {t.wRiichi}
                    </Text>
                  </TouchableOpacity>
                </View>

                {riichiStatus !==
                  'none' && (
                  <View
                    style={[
                      styles.switchRow,
                      { marginTop: 10 },
                    ]}
                  >
                    <Text
                      style={
                        styles.label
                      }
                    >
                      {t.ippatsu}
                    </Text>

                    <Switch
                      value={
                        isIppatsu
                      }
                      onValueChange={
                        setIsIppatsu
                      }
                      trackColor={{
                        true: '#10B981',
                        false:
                          '#334155',
                      }}
                    />
                  </View>
                )}
              </>
            )}

            <View
              style={{ marginTop: 20 }}
            >
              <Text
                style={
                  styles.sectionLabel
                }
              >
                {t.dora}
              </Text>

              <View
                style={styles.doraRow}
              >
                {doraIndicators.map(
                  (tile, i) => (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      key={i}
                      onPress={() =>
                        setDoraIndicators(
                          prev =>
                            prev.filter(
                              (_, idx) =>
                                idx !==
                                i
                            )
                        )
                      }
                      style={
                        styles.tileWrapper
                      }
                    >
                      <TileIcon
                        name={tile}
                        width={30}
                        height={40}
                      />
                    </TouchableOpacity>
                  )
                )}

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setModalTarget(
                      'dora'
                    );
                    setShowAddTileModal(
                      true
                    );
                  }}
                  style={
                    styles.addDoraBtn
                  }
                >
                  <Text
                    style={
                      styles.addDoraText
                    }
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!hasOpenMeld &&
              riichiStatus !==
                'none' && (
                <View
                  style={{
                    marginTop: 20,
                  }}
                >
                  <Text
                    style={
                      styles.sectionLabel
                    }
                  >
                    {t.uraDora}
                  </Text>

                  <View
                    style={
                      styles.doraRow
                    }
                  >
                    {uraDoraIndicators.map(
                      (tile, i) => (
                        <TouchableOpacity
                          activeOpacity={
                            0.7
                          }
                          key={i}
                          onPress={() =>
                            setUraDoraIndicators(
                              prev =>
                                prev.filter(
                                  (
                                    _,
                                    idx
                                  ) =>
                                    idx !==
                                    i
                                )
                            )
                          }
                          style={
                            styles.tileWrapper
                          }
                        >
                          <TileIcon
                            name={
                              tile
                            }
                            width={30}
                            height={
                              40
                            }
                          />
                        </TouchableOpacity>
                      )
                    )}

                    <TouchableOpacity
                      activeOpacity={
                        0.7
                      }
                      onPress={() => {
                        setModalTarget(
                          'uradora'
                        );
                        setShowAddTileModal(
                          true
                        );
                      }}
                      style={
                        styles.addDoraBtn
                      }
                    >
                      <Text
                        style={
                          styles.addDoraText
                        }
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            <Text
              style={[
                styles.sectionLabel,
                { marginTop: 25 },
              ]}
            >
              {t.seatWind}
            </Text>

            <View
              style={styles.windRow}
            >
              {[
                'east',
                'south',
                'west',
                'north',
              ].map(w => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  key={w}
                  style={[
                    styles.windBtn,
                    seatWind === w &&
                      styles.windBtnActive,
                  ]}
                  onPress={() =>
                    setSeatWind(w)
                  }
                >
                  <Text
                    style={
                      seatWind === w
                        ? styles.windTextActive
                        : styles.windText
                    }
                  >
                    {t.winds[
                      w as keyof typeof t.winds
                    ].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={[
                styles.sectionLabel,
                { marginTop: 20 },
              ]}
            >
              {t.roundWind}
            </Text>

            <View
              style={styles.windRow}
            >
              {[
                'east',
                'south',
                'west',
                'north',
              ].map(w => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  key={w}
                  style={[
                    styles.windBtn,
                    roundWind === w &&
                      styles.windBtnActive,
                  ]}
                  onPress={() =>
                    setRoundWind(w)
                  }
                >
                  <Text
                    style={
                      roundWind === w
                        ? styles.windTextActive
                        : styles.windText
                    }
                  >
                    {t.winds[
                      w as keyof typeof t.winds
                    ].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={styles.navigationRow}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.backButton}
              onPress={() =>
                changeStep('edit')
              }
              disabled={loading}
            >
              <Text
                style={
                  styles.backButtonText
                }
              >
                {locale === 'zh'
                  ? '返回'
                  : 'Back'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.nextButton}
              onPress={calculateScore}
              disabled={loading}
            >
              <Text
                style={
                  styles.nextButtonText
                }
              >
                {loading
                  ? t.calculating
                  : t.calculateButton}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PHASE 4: RESULTS */}
      {step === 'result' &&
        calcResult && (
          <View
            style={
              styles.editorContainer
            }
          >
            <View
              style={styles.scoreHero}
            >
              {tierConfig.label && (
                <View
                  style={[
                    styles.tierBadge,
                    {
                      backgroundColor:
                        tierConfig.color,
                      shadowColor:
                        tierConfig.color,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.tierBadgeText
                    }
                  >
                    {tierConfig.label.toUpperCase()}
                  </Text>
                </View>
              )}

              <Text
                style={[
                  styles.scoreText,
                  {
                    color:
                      tierConfig.color,
                  },
                ]}
              >
                {isTsumo
                  ? seatWind ===
                      'east' ||
                    calcResult.additional_points ===
                      calcResult.points
                    ? `${calcResult.points} ${t.all}`
                    : `${calcResult.additional_points} / ${calcResult.points} ${t.pts}`
                  : `${calcResult.points} ${t.pts}`}
              </Text>

              <Text
                style={[
                  styles.scoreSubtitle,
                  {
                    color:
                      tierConfig.color,
                  },
                ]}
              >
                {renderHanFuOrYakuman()}
              </Text>
            </View>

            <View
              style={styles.cardBox}
            >
              {calcResult.yaku?.map(
                (
                  y: {
                    name: string;
                    han: string | number;
                  },
                  i: number
                ) => (
                  <View
                    key={i}
                    style={
                      styles.yakuRow
                    }
                  >
                    <Text
                      style={
                        styles.yakuText
                      }
                    >
                      {getTranslatedYaku(
                        y.name,
                        locale
                      )}
                    </Text>

                    <Text
                      style={
                        styles.yakuValue
                      }
                    >
                      {formatHan(
                        y.han,
                        locale
                      )}
                    </Text>
                  </View>
                )
              )}
            </View>

            <View
              style={styles.navigationRow}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={
                  styles.backButton
                }
                onPress={() =>
                  changeStep(
                    'context'
                  )
                }
              >
                <Text
                  style={
                    styles.backButtonText
                  }
                >
                  {locale === 'zh'
                    ? '返回'
                    : 'Back'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={
                  styles.nextButton
                }
                onPress={
                  resetAndScanAnother
                }
              >
                <Text
                  style={
                    styles.nextButtonText
                  }
                >
                  {t.scanAnother}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      <StatusBar style="light" />

      <Modal
        visible={showAddTileModal}
        animationType="slide"
        transparent={true}
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContent}
          >
            <View
              style={styles.modalHandle}
            />

            <Text
              style={styles.modalTitle}
            >
              {redFivePrompt
                ? locale === 'zh'
                  ? '选择包含赤5的吃'
                  : 'Select Red 5 Chi'
                : modalTarget === 'meld'
                ? locale === 'zh'
                  ? '选择副露类型和起始牌'
                  : 'Select Meld Type & Base Tile'
                : t.selectTileToAdd}
            </Text>

            {modalTarget === 'meld' &&
              !redFivePrompt && (
                <View
                  style={[
                    styles.segmentedControl,
                    {
                      width: '100%',
                      marginBottom: 20,
                    },
                  ]}
                >
                  {[
                    'pon',
                    'chi',
                    'kan',
                    'ankan',
                  ].map(type => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      key={type}
                      onPress={() =>
                        setNewMeldType(
                          type as any
                        )
                      }
                      style={[
                        styles.segmentBtn,
                        newMeldType ===
                          type &&
                          styles.segmentActive,
                      ]}
                    >
                      <Text
                        style={
                          newMeldType ===
                          type
                            ? styles.segmentTextActive
                            : styles.segmentText
                        }
                      >
                        {
                          t.meldTypes[
                            type as keyof typeof t.meldTypes
                          ]
                        }
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

            {redFivePrompt ? (
              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  marginVertical: 10,
                }}
              >
                <Text
                  style={[
                    styles.subtext,
                    {
                      textAlign:
                        'center',
                      marginBottom: 20,
                    },
                  ]}
                >
                  {locale === 'zh'
                    ? '请选择包含该赤5的组合：'
                    : 'Select the sequence containing the Red 5:'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.redFiveBtn}
                  onPress={() =>
                    finalizeMeld(
                      '340',
                      redFivePrompt ===
                        'm'
                        ? 'man'
                        : redFivePrompt ===
                          'p'
                        ? 'pin'
                        : 'sou',
                      'chi'
                    )
                  }
                >
                  <TileIcon
                    name={`3${redFivePrompt}`}
                    width={42}
                    height={58}
                  />

                  <TileIcon
                    name={`4${redFivePrompt}`}
                    width={42}
                    height={58}
                  />

                  <TileIcon
                    name={`0${redFivePrompt}`}
                    width={42}
                    height={58}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.redFiveBtn}
                  onPress={() =>
                    finalizeMeld(
                      '406',
                      redFivePrompt ===
                        'm'
                        ? 'man'
                        : redFivePrompt ===
                          'p'
                        ? 'pin'
                        : 'sou',
                      'chi'
                    )
                  }
                >
                  <TileIcon
                    name={`4${redFivePrompt}`}
                    width={42}
                    height={58}
                  />

                  <TileIcon
                    name={`0${redFivePrompt}`}
                    width={42}
                    height={58}
                  />

                  <TileIcon
                    name={`6${redFivePrompt}`}
                    width={42}
                    height={58}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.redFiveBtn}
                  onPress={() =>
                    finalizeMeld(
                      '067',
                      redFivePrompt ===
                        'm'
                        ? 'man'
                        : redFivePrompt ===
                          'p'
                        ? 'pin'
                        : 'sou',
                      'chi'
                    )
                  }
                >
                  <TileIcon
                    name={`0${redFivePrompt}`}
                    width={42}
                    height={58}
                  />

                  <TileIcon
                    name={`6${redFivePrompt}`}
                    width={42}
                    height={58}
                  />

                  <TileIcon
                    name={`7${redFivePrompt}`}
                    width={42}
                    height={58}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={
                  styles.modalGrid
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
                {ALL_TILES.map(tile => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    key={tile}
                    style={
                      styles.tileWrapper
                    }
                    onPress={() => {
                      if (
                        modalTarget ===
                        'hand'
                      ) {
                        setEditableClosedHand(
                          prev => [
                            ...prev,
                            tile,
                          ]
                        );

                        setShowAddTileModal(
                          false
                        );
                      } else if (
                        modalTarget ===
                        'dora'
                      ) {
                        setDoraIndicators(
                          prev => [
                            ...prev,
                            tile,
                          ]
                        );

                        setShowAddTileModal(
                          false
                        );
                      } else if (
                        modalTarget ===
                        'uradora'
                      ) {
                        setUraDoraIndicators(
                          prev => [
                            ...prev,
                            tile,
                          ]
                        );

                        setShowAddTileModal(
                          false
                        );
                      } else if (
                        modalTarget ===
                        'meld'
                      ) {
                        handleAddManualMeld(
                          tile
                        );
                      }
                    }}
                  >
                    <TileIcon
                      name={tile}
                      width={42}
                      height={58}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              style={
                styles.modalCloseButton
              }
              onPress={() => {
                if (redFivePrompt) {
                  setRedFivePrompt(null);
                } else {
                  setShowAddTileModal(
                    false
                  );
                }
              }}
            >
              <Text
                style={
                  styles.modalCloseText
                }
              >
                {redFivePrompt
                  ? locale === 'zh'
                    ? '返回'
                    : 'Back'
                  : t.cancel}
              </Text>
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
    backgroundColor: '#0F172A',
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  langButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  langButtonText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },

  // Hero Buttons
  primaryButton: {
    backgroundColor: '#10B981',
    width: '85%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: '#1E293B',
    width: '85%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  secondaryButtonText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
  },

  editorContainer: {
    width: '100%',
    alignItems: 'center',
  },

  resultTitle: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },

  subtext: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },

  sectionLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Tile Grids
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },

  tileWrapper: {
    margin: 3,
  },

  meldContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
    width: '100%',
  },

  meldGroup: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },

  addTileBtn: {
    width: 36,
    height: 48,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 3,
  },

  addMeldBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 45,
    height: 55,
    backgroundColor: '#10B981',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },

  addTileBtnText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },

  goldenHighlight: {
    borderColor: '#F59E0B',
    borderWidth: 3,
    borderRadius: 8,
    transform: [{ translateY: -12 }],
    shadowColor: '#F59E0B',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },

  // Cards & Context Box
  cardBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 20,
    marginTop: 25,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  label: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '500',
    maxWidth: '75%',
  },

  // Custom Counters
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 5,
  },

  counterBtn: {
    fontSize: 22,
    color: '#10B981',
    fontWeight: 'bold',
    paddingHorizontal: 15,
    paddingVertical: 5,
  },

  counterValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },

  // Segmented Controls
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
  },

  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },

  segmentActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },

  segmentText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },

  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Winds & Doras
  windRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  windBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  windBtnActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },

  windText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },

  windTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  doraRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 12,
  },

  addDoraBtn: {
    width: 32,
    height: 44,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginLeft: 6,
  },

  addDoraText: {
    color: '#94A3B8',
    fontSize: 22,
    fontWeight: '600',
  },

  // Score Results
  scoreHero: {
    alignItems: 'center',
    marginVertical: 20,
  },

  tierBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },

  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },

  scoreText: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },

  scoreSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 5,
  },

  yakuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  yakuText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '500',
  },

  yakuValue: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '700',
  },

  // Navigation Row
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 35,
  },

  backButton: {
    backgroundColor: '#1E293B',
    flex: 1,
    marginRight: 12,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  backButtonText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
  },

  nextButton: {
    backgroundColor: '#10B981',
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    height: '85%',
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },

  modalHandle: {
    width: 50,
    height: 5,
    backgroundColor: '#475569',
    borderRadius: 3,
    marginTop: 15,
    marginBottom: 20,
  },

  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 25,
  },

  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 20,
  },

  modalCloseButton: {
    backgroundColor: '#EF4444',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  modalCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  redFiveBtn: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 15,
    width: '85%',
    justifyContent: 'center',
    gap: 10,
  },

  // Camera Styles
  cameraContainer: {
    width: '100%',
    height: 600,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#000',
    position: 'relative',
  },

  camera: {
    ...StyleSheet.absoluteFill,
  },

  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 100,
    flexDirection: 'row',
  },

  overlayHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:
      'rgba(15, 23, 42, 0.4)',
  },

  overlayDivider: {
    width: 2,
    backgroundColor: '#10B981',
    borderStyle: 'dashed',
  },

  overlayText: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    transform: [{ rotate: '90deg' }],
    opacity: 0.5,
    letterSpacing: 2,
  },

  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 25,
    backgroundColor:
      'rgba(15, 23, 42, 0.85)',
  },

  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#10B981',
  },

  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#10B981',
  },

  closeCamBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },

  closeCamText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
});