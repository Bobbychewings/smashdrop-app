import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// 1. Import the specific font weights we used in our UI
import {
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
  useFonts
} from '@expo-google-fonts/rajdhani';

// Prevent the app from flashing blank while the font is downloading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 2. Load the fonts into memory
  const [loaded, error] = useFonts({
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  // 3. Hide the splash screen once the fonts are ready
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // 4. The Safety Lock: Do not render anything until fonts are loaded!
  if (!loaded && !error) {
    return null; 
  }

  return (
    // We use headerShown: false so the default ugly top headers don't ruin our sleek dark mode UI!
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="host" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="game/[id]" />
    </Stack>
  );
}