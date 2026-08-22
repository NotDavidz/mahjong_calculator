import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hides top header bar
        contentStyle: { backgroundColor: '#0F172A' }, // Matches dark theme background
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}