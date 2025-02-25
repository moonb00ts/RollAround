import React from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppButton from "./AppButton";
import colors from "./config/colors";

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Find and share skate spots near you</Text>
      </View>

      <View style={styles.buttonContainer}>
        <AppButton
          title="Login"
          onPress={() => router.push("/(auth)/login")}
          color={colors.light}
        />
        <AppButton
          title="Sign Up"
          onPress={() => router.push("/(auth)/register")}
          color={colors.light}
        />
      </View>

      <Text style={styles.termsText}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    padding: 20,
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "80%",
    height: 100,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: colors.white,
    textAlign: "center",
    fontFamily: "SubwayBerlinSC",
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 20,
  },
  termsText: {
    color: colors.secondary,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
  },
});
