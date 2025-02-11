import React from "react";
import { Image, View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityCard } from "../../components/ActivityCard";
import AppText from "../../components/AppText";
import colors from "../../components/config/colors";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function Home() {
  const [fontsLoaded] = useFonts({
    // Add your custom fonts here
    SubwayBerlinSC: require("../../../assets/fonts/SubwayBerlinSC.ttf"),
    // Add more fonts as needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Hide the splash screen once fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Don't render anything until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  const activities = [
    {
      name: "Joe Haskins",
      action: "Added a new spot in: Clevedon, UK.",
    },
    {
      name: "Bear Myles",
      action: "Added a new clip to a spot: Lloyds ampitheatre.",
    },
    {
      name: "Archie Turner",
      action: "Added a new clip to a spot: Deaner Slab.",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView style={styles.scrollView}>
        {activities.map((activity, index) => (
          <ActivityCard key={index} activity={activity} />
        ))}
        <AppText style={{ marginTop: 25, fontSize: 25 }}>
          Thats all for now!
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  logo: {
    height: 40,
    width: "50%",
  },
});
