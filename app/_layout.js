import { Stack } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/authContext";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    SubwayBerlinSC: require("../assets/fonts/SubwayBerlinSC.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Don't render anything until fonts are loaded
  if (!fontsLoaded || loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Common screens that don't require authentication */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Authentication Group */}
      <Stack.Screen
        name="auth"
        options={{
          headerShown: false,
          // Prevent going back to welcome screen after login/register
          gestureEnabled: false,
        }}
      />

      {/* Main App Group (Tabs) */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          // Prevent going back to auth screens
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
