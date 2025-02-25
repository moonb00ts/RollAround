import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "./config/colors";

export const ActivityCard = ({ activity }) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.username}>{activity.name}</Text>
        <Text style={styles.action}>{activity.action}</Text>
        {activity.timestamp && (
          <Text style={styles.timestamp}>{activity.timestamp}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: colors.medium,
    borderBottomWidth: 1,
    borderBottomColor: "#2c6240",
    flex: 1,
    margin: 10,
    borderRadius: 15,
  },
  content: {
    marginLeft: 10,
    flex: 1,
  },
  username: {
    color: colors.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  action: {
    color: "#fff",
  },
  timestamp: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 5,
    fontStyle: "italic",
  },
});

export default ActivityCard;
