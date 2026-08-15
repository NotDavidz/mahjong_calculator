import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Switch, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { File } from 'expo-file-system';
import { TileIcon } from '@/components/tileIcon';// Adjust path if your folder is different

const ALL_TILES = [
  '1m','2m','3m','4m','5m','0m','6m','7m','8m','9m',
  '1p','2p','3p','4p','5p','0p','6p','7p','8p','9p',
  '1s','2s','3s','4s','5s','0s','6s','7s','8s','9s',
  'ton','nan','shaa','pei','haku','hatsu','chun'
];

export default function IndexScreen() {
  // App Flow State
  const [step, setStep] = useState<'upload' | 'edit' | 'context' | 'result'>('upload');
  const [loading, setLoading] = useState(false);
  
  const [showAddTileModal, setShowAddTileModal] = useState(false);

  // Editor State
  const [editableClosedHand, setEditableClosedHand] = useState<string[]>([]);
  const [editableMelds, setEditableMelds] = useState<any[]>([]);
  
  // Game Context State
  const [winTileIndex, setWinTileIndex] = useState<number | null>(null);
  const [isTsumo, setIsTsumo] = useState(false);
  const [isRiichi, setIsRiichi] = useState(false);
  const [isDoubleRiichi, setIsDoubleRiichi] = useState(false);
  const [isIppatsu, setIsIppatsu] = useState(false);
  const [isUnderTheSea, setIsUnderTheSea] = useState(false); // Haitei/Houtei
  const [seatWind, setSeatWind] = useState('east');
  const [roundWind, setRoundWind] = useState('east');
  
  // Final Result
  const [calcResult, setCalcResult] = useState<any>(null);

  // NEW: Function to remove a tile when tapped
  const removeTile = (indexToRemove: number) => {
    setEditableClosedHand(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const HONOR_MAP: Record<string, string> = {
    "ton": "1", "nan": "2", "shaa": "3", "pei": "4",
    "haku": "5", "hatsu": "6", "chun": "7"
  };

  // Reconstructs YOLO names for visual rendering of Melds
  const getYoloNamesFromMeld = (meld: any) => {
    const honorReverseMap: Record<string, string> = { "1": "ton", "2": "nan", "3": "shaa", "4": "pei", "5": "haku", "6": "hatsu", "7": "chun" };
    return meld.tiles.split('').map((char: string) => {
      if (meld.suit === "honors") return honorReverseMap[char];
      const suitChar = meld.suit === "man" ? "m" : meld.suit === "pin" ? "p" : "s";
      return `${char}${suitChar}`;
    });
  };

  // Translates the edited visual hand into the Mahjong backend format
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

  // Fires the final score calculation
  const calculateScore = async () => {
    if (winTileIndex === null) {
      alert("Please tap your winning tile before calculating!");
      return;
    }
    
    setLoading(true);

    const allHandTiles = [...editableClosedHand];
    editableMelds.forEach(meld => {
      const meldTiles = getYoloNamesFromMeld(meld);
      allHandTiles.push(...meldTiles);
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

    const payload = {
      closed_man: parsedHand.m,
      closed_pin: parsedHand.p,
      closed_sou: parsedHand.s,
      closed_honors: parsedHand.z,
      win_tile_value: winValue,
      win_tile_suit: winSuit,
      is_tsumo: isTsumo,
      is_riichi: isRiichi,
      is_double_riichi: isDoubleRiichi,
      is_ippatsu: isIppatsu,
      is_under_the_sea: isUnderTheSea,
      seat_wind: seatWind,
      round_wind: roundWind,
      melds: editableMelds
    };

    // DEBUG: See exactly what you are sending to the backend
    console.log("--- SENDING PAYLOAD ---");
    console.log(JSON.stringify(payload, null, 2));

    try {
      const response = await fetch('http://192.168.1.177:8000/calculate', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error("Calculation failed");
      
      const data = await response.json();
      
      // Catch Mahjong logic errors (No Yaku, Not Winning, etc.)
      if (data.status === "error") {
        alert(`Invalid Hand: ${data.message}`);
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
      const selectedUri = result.assets[0].uri;
      await sendImageToBackend(selectedUri);
    }
  };

  const addNewTile = (tileName: string) => {
              setEditableClosedHand(prev => [...prev, tileName]);
              setShowAddTileModal(false);
            }; 
          

 const sendImageToBackend = async (uri: string) => {
  setLoading(true);

  try {
    const file = new File(uri);
    const formData = new FormData();
    formData.append('file', file as any);

    const response = await fetch(
      'http://192.168.1.177:8000/analyze-image',
      {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Backend error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    
    if (data.status === "success") {
      setEditableClosedHand(data.closed_hand_raw);
      // Grab the first valid meld configuration if available
      if (data.meld_options && data.meld_options.length > 0) {
        setEditableMelds(data.meld_options[0]);
      } else {
        setEditableMelds([]);
      }
      setStep('edit'); // Move to confirmation screen!
    }

  } catch (error: any) {
    console.error('UPLOAD ERROR:', error);
    alert(`Failed to upload image: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mahjong Calculator</Text>

      {/* PHASE 1: UPLOAD */}
      {step === 'upload' && (
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity style={styles.button} onPress={pickAndAnalyzeImage} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Analyzing..." : "Scan Hand"}</Text>
          </TouchableOpacity>
          {loading && <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />}
        </View>
      )}

      {/* PHASE 2: EDIT HAND */}
      {step === 'edit' && (
        <View style={styles.editorContainer}>
          <Text style={styles.resultTitle}>Confirm Closed Hand</Text>
          <Text style={styles.subtext}>Tap a tile to delete it.</Text> 

          <View style={styles.tileGrid}>
            {editableClosedHand.map((tileName, index) => (
              <TouchableOpacity key={index} onPress={() => removeTile(index)} style={styles.tileWrapper}>
                <TileIcon name={tileName} />
              </TouchableOpacity>
            ))}
            
            {/* NEW: The Plus Button */}
            <TouchableOpacity 
              onPress={() => setShowAddTileModal(true)} 
              style={[styles.tileWrapper, { width: 36, height: 48, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }]}
            >
              <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>+</Text>
            </TouchableOpacity>
          </View>

          {editableMelds.length > 0 && (
            <>
              <Text style={[styles.resultTitle, { marginTop: 20 }]}>Confirm Open Melds</Text>
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
            <Text style={styles.buttonText}>Confirm Hand</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PHASE 3: GAME CONTEXT */}
      {step === 'context' && (
        <View style={styles.editorContainer}>
          <Text style={styles.resultTitle}>Tap Your Winning Tile!</Text>
          <View style={styles.tileGrid}>
            {editableClosedHand.map((tileName, index) => (
              <TouchableOpacity key={index} onPress={() => setWinTileIndex(index)} 
                style={[styles.tileWrapper, winTileIndex === index && styles.goldenHighlight]}>
                <TileIcon name={tileName} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.contextBox}>
            <View style={styles.switchRow}><Text style={styles.label}>Tsumo (vs Ron)</Text><Switch value={isTsumo} onValueChange={setIsTsumo}/></View>
            <View style={styles.switchRow}><Text style={styles.label}>Riichi</Text><Switch value={isRiichi} onValueChange={setIsRiichi}/></View>
            <View style={styles.switchRow}><Text style={styles.label}>Double Riichi</Text><Switch value={isDoubleRiichi} onValueChange={setIsDoubleRiichi}/></View>
            <View style={styles.switchRow}><Text style={styles.label}>Ippatsu</Text><Switch value={isIppatsu} onValueChange={setIsIppatsu}/></View>
            <View style={styles.switchRow}><Text style={styles.label}>Under The Sea</Text><Switch value={isUnderTheSea} onValueChange={setIsUnderTheSea}/></View>

            <Text style={[styles.label, {marginTop: 15}]}>Seat Wind</Text>
            <View style={styles.windRow}>
              {['east', 'south', 'west', 'north'].map(w => (
                <TouchableOpacity key={w} style={[styles.windBtn, seatWind === w && styles.windBtnActive]} onPress={() => setSeatWind(w)}>
                  <Text style={seatWind === w ? styles.windTextActive : styles.windText}>{w.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, {marginTop: 15}]}>Round Wind</Text>
            <View style={styles.windRow}>
              {['east', 'south', 'west', 'north'].map(w => (
                <TouchableOpacity key={w} style={[styles.windBtn, roundWind === w && styles.windBtnActive]} onPress={() => setRoundWind(w)}>
                  <Text style={roundWind === w ? styles.windTextActive : styles.windText}>{w.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={calculateScore} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Calculating..." : "Calculate Score"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PHASE 4: RESULTS */}
      {step === 'result' && calcResult && (
        <View style={styles.editorContainer}>
          <Text style={[styles.title, { color: '#FFD700', fontSize: 36, textAlign: 'center' }]}>
            {isTsumo 
              ? calcResult.additional_points > 0 
                ? `${calcResult.additional_points} / ${calcResult.points} pts` 
                : `${calcResult.points} ALL`
              : `${calcResult.points} pts`}
          </Text>
          <Text style={styles.resultTitle}>{calcResult.han} Han / {calcResult.fu} Fu</Text>
          
          <View style={styles.yakuBox}>
            {calcResult.yaku?.map((y: string, i: number) => (
              <Text key={i} style={styles.yakuText}>• {y}</Text>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, { marginTop: 30 }]} onPress={() => setStep('upload')}>
            <Text style={styles.buttonText}>Scan Another Hand</Text>
          </TouchableOpacity>
        </View>
      )}

      <StatusBar style="light" />
    
    <Modal visible={showAddTileModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.resultTitle}>Select Tile to Add</Text>
            
            <ScrollView contentContainerStyle={styles.modalGrid}>
              {ALL_TILES.map((tile) => (
                <TouchableOpacity 
                  key={tile} 
                  style={styles.tileWrapper}
                  onPress={() => {
                    setEditableClosedHand(prev => [...prev, tile]);
                    setShowAddTileModal(false);
                  }}
                >
                  <TileIcon name={tile} width={40} height={55} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.button, { marginTop: 20, backgroundColor: '#d9534f' }]} onPress={() => setShowAddTileModal(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20 },
  button: { backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subtext: { color: '#aaa', marginBottom: 10 },
  editorContainer: { width: '100%', alignItems: 'center' },
  resultTitle: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  
  // Tiles & Melds
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', backgroundColor: '#0a4a3c', padding: 10, borderRadius: 8, width: '100%' },
  tileWrapper: { margin: 2 },
  meldContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginTop: 10 },
  meldGroup: { flexDirection: 'row', backgroundColor: '#0a4a3c', padding: 5, borderRadius: 8 },
  goldenHighlight: { borderColor: '#FFD700', borderWidth: 3, borderRadius: 6, transform: [{ translateY: -10 }] },

  // Context UI
  contextBox: { width: '100%', backgroundColor: '#2D2D2D', padding: 20, borderRadius: 10, marginTop: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  windRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  windBtn: { flex: 1, backgroundColor: '#444', paddingVertical: 10, marginHorizontal: 5, borderRadius: 6, alignItems: 'center' },
  windBtnActive: { backgroundColor: '#4CAF50' },
  windText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  windTextActive: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  // Results UI
  yakuBox: { backgroundColor: '#2D2D2D', padding: 20, borderRadius: 10, marginTop: 20, width: '100%' },
  yakuText: { color: '#D4D4D4', fontSize: 16, marginBottom: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  modalContent: { width: '95%', height: '80%', backgroundColor: '#1E1E1E', borderRadius: 15, padding: 20, alignItems: 'center' },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, paddingBottom: 30 },
});