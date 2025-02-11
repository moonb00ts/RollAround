import React from "react";
import { Text, StyleSheet } from "react-native";

function AppText({ children, style, ...otherProps }) {
  return (
    <Text style={[styles.text, style]} {...otherProps}>
      {children}
    </Text>
  );
}
const styles = StyleSheet.create({
  text: {
    color: "#fff",
    fontFamily: "SubwayBerlinSC",
    fontSize: 30,
    textAlign: "center",
  },
});
export default AppText;
