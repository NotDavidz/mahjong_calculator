import React from 'react';
import { View, StyleSheet } from 'react-native';

// 1. Base Tiles
import Front from '../../assets/tiles/Front.svg';
import Back from '../../assets/tiles/Back.svg';

// 2. Manzu (Characters)
import Man1 from '../../assets/tiles/Man1.svg';
import Man2 from '../../assets/tiles/Man2.svg';
import Man3 from '../../assets/tiles/Man3.svg';
import Man4 from '../../assets/tiles/Man4.svg';
import Man5 from '../../assets/tiles/Man5.svg';
import Man5Dora from '../../assets/tiles/Man5-Dora.svg';
import Man6 from '../../assets/tiles/Man6.svg';
import Man7 from '../../assets/tiles/Man7.svg';
import Man8 from '../../assets/tiles/Man8.svg';
import Man9 from '../../assets/tiles/Man9.svg';

// 3. Pinzu (Circles)
import Pin1 from '../../assets/tiles/Pin1.svg';
import Pin2 from '../../assets/tiles/Pin2.svg';
import Pin3 from '../../assets/tiles/Pin3.svg';
import Pin4 from '../../assets/tiles/Pin4.svg';
import Pin5 from '../../assets/tiles/Pin5.svg';
import Pin5Dora from '../../assets/tiles/Pin5-Dora.svg';
import Pin6 from '../../assets/tiles/Pin6.svg';
import Pin7 from '../../assets/tiles/Pin7.svg';
import Pin8 from '../../assets/tiles/Pin8.svg';
import Pin9 from '../../assets/tiles/Pin9.svg';

// 4. Souzu (Bamboos)
import Sou1 from '../../assets/tiles/Sou1.svg';
import Sou2 from '../../assets/tiles/Sou2.svg';
import Sou3 from '../../assets/tiles/Sou3.svg';
import Sou4 from '../../assets/tiles/Sou4.svg';
import Sou5 from '../../assets/tiles/Sou5.svg';
import Sou5Dora from '../../assets/tiles/Sou5-Dora.svg';
import Sou6 from '../../assets/tiles/Sou6.svg';
import Sou7 from '../../assets/tiles/Sou7.svg';
import Sou8 from '../../assets/tiles/Sou8.svg';
import Sou9 from '../../assets/tiles/Sou9.svg';

// 5. Honors
import Ton from '../../assets/tiles/Ton.svg';
import Nan from '../../assets/tiles/Nan.svg';
import Shaa from '../../assets/tiles/Shaa.svg';
import Pei from '../../assets/tiles/Pei.svg';
import Haku from '../../assets/tiles/Haku.svg';
import Hatsu from '../../assets/tiles/Hatsu.svg';
import Chun from '../../assets/tiles/Chun.svg';

// YOLO class name -> SVG Component Map
const INK_MAP: Record<string, any> = {
  "1m": Man1, "2m": Man2, "3m": Man3, "4m": Man4, "5m": Man5, "0m": Man5Dora, "6m": Man6, "7m": Man7, "8m": Man8, "9m": Man9,
  "1p": Pin1, "2p": Pin2, "3p": Pin3, "4p": Pin4, "5p": Pin5, "0p": Pin5Dora, "6p": Pin6, "7p": Pin7, "8p": Pin8, "9p": Pin9,
  "1s": Sou1, "2s": Sou2, "3s": Sou3, "4s": Sou4, "5s": Sou5, "0s": Sou5Dora, "6s": Sou6, "7s": Sou7, "8s": Sou8, "9s": Sou9,
  "ton": Ton, "nan": Nan, "shaa": Shaa, "pei": Pei, "haku": Haku, "hatsu": Hatsu, "chun": Chun
};

export const TileIcon = ({ name, width = 36, height = 48 }: { name: string, width?: number, height?: number }) => {
  if (name === "back") {
    return <Back width={width} height={height} />;
  }

  const InkComponent = INK_MAP[name];

  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      {/* Base Layer */}
      <View style={StyleSheet.absoluteFill}>
        <Front width="100%" height="100%" />
      </View>
      
      {/* Ink Layer (Haku/White Dragon just renders the Front base if no ink is found) */}
      {InkComponent && (
        <View style={StyleSheet.absoluteFill}>
          <InkComponent width="100%" height="100%" />
        </View>
      )}
    </View>
  );
};