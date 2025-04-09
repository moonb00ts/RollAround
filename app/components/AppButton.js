import React from "react";
import { View, StyleSheet } from "react-native";
import colors from "./config/colors";
import { TouchableOpacity } from "react-native";
import AppText from "./AppText";

function AppButton({ onPress, color = colors.medium, title }) {
  return (
    <View style={styles.buttonsContainer}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: color }]}
        onPress={onPress}
      >
        <AppText style={styles.buttonText}>{title}</AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.light,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    maxWidth: 500,
    minWidth: 300,
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignSelf: "center",
  },
  buttonText: {
    fontFamily: "SubwayBerlinSC", // Just use the font name
    color: colors.white,
    fontSize: 28,
    fontWeight: "500",
  },
});

export default AppButton;
