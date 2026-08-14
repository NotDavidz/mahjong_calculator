import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { File } from 'expo-file-system';

export default function IndexScreen() {
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);

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

  
 const sendImageToBackend = async (uri: string) => {
  setLoading(true);
  setApiResult(null);

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
    setApiResult(data);

  } catch (error: any) {
    console.error('UPLOAD ERROR:', error);

    setApiResult({
      error: error.message || 'Failed to upload image',
    });
  } finally {
    setLoading(false);
  }
};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mahjong Calculator</Text>
      
      <TouchableOpacity style={styles.button} onPress={pickAndAnalyzeImage} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Analyzing..." : "Upload & Analyze Hand"}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />}

      {apiResult && (
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Backend Response:</Text>
          <Text style={styles.resultText}>{JSON.stringify(apiResult, null, 2)}</Text>
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 30,
    backgroundColor: '#2D2D2D',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    maxHeight: 400,
  },
  resultTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    color: '#D4D4D4',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
  }
});