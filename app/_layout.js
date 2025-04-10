import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { AuthProvider } from "./context/authContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  try {
    const [fontsLoaded] = useFonts({
      SubwayBerlinSC: require("../assets/fonts/SubwayBerlinSC.ttf"),
    });

    useEffect(() => {
      if (fontsLoaded) {
        try {
          SplashScreen.hideAsync();
        } catch (error) {
          console.log("Error hiding splash screen:", error);
        }
      }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
      return null;
    }
    return (
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="spot"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="addSpot"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="event"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="addEvent"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
      </AuthProvider>
    );
  } catch (error) {
    // Render a simple error screen instead of crashing
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text>Failed to start the app. Please try again.</Text>
      </View>
    );
  }
}
