import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../components/config/colors";

export default function Profile() {
  const friends = [1, 2, 3, 4]; // Placeholder for friend avatars

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar} />
          <Text style={styles.username}>Big Wayne</Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>Saved spots: 9</Text>
          <Text style={styles.statsText}>Home park: NSP</Text>
          <Text style={styles.statsText}>User since: 2019</Text>
        </View>
      </View>

      <View style={styles.friendsSection}>
        <View style={styles.friendsHeader}>
          <Text style={styles.friendsTitle}>Friends (13)</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
            <Ionicons name="add" size={20} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <View style={styles.friendsGrid}>
          {friends.map((friend, index) => (
            <View key={index} style={styles.friendAvatar} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
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
  profileSection: {
    padding: 20,
    alignItems: "center",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.medium,
    marginBottom: 10,
  },
  username: {
    color: colors.primary,
    fontSize: 24,
    fontFamily: "SubwayBerlinSC",
  },
  statsContainer: {
    alignItems: "center",
  },
  statsText: {
    color: "#fff",
    fontSize: 16,
    marginVertical: 5,
  },
  friendsSection: {
    padding: 20,
  },
  friendsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  friendsTitle: {
    color: colors.primary,
    fontSize: 20,
    fontFamily: "SubwayBerlinSC",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: colors.dark,
    marginRight: 5,
    fontWeight: "600",
  },
  friendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.medium,
  },
});
