import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../components/config/colors";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/authContext";
import FriendSearch from "../../components/FriendSearch";

export default function Profile() {
  const { logout, userProfile, user } = useAuth();
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Skater";

  const handleLogout = async () => {
    if (loggingOut) return; // Prevent multiple clicks

    try {
      setLoggingOut(true);
      await logout();
      // Auth context handles navigation
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
      setLoggingOut(false);
    }
  };

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
          <Text style={styles.username}>{displayName}</Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Saved spots: {userProfile?.favoriteSkateparks?.length || 0}
          </Text>
          <Text style={styles.statsText}>
            Friends: {userProfile?.friends?.length || 0}
          </Text>
          <Text style={styles.statsText}>
            User since:{" "}
            {userProfile?.createdAt
              ? new Date(
                  userProfile.createdAt.toDate?.() || userProfile.createdAt
                ).getFullYear()
              : "2025"}
          </Text>
        </View>
      </View>

      <View style={styles.friendsSection}>
        <View style={styles.friendsHeader}>
          <Text style={styles.friendsTitle}>
            Friends ({userProfile?.friends?.length || 0})
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowFriendSearch(true)}
          >
            <Text style={styles.addButtonText}>Add</Text>
            <Ionicons name="person-add" size={20} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {userProfile?.friends?.length > 0 ? (
          <View style={styles.friendsGrid}>
            {userProfile.friends.slice(0, 4).map((friend, index) => (
              <View key={index} style={styles.friendAvatar}>
                <Text style={styles.avatarInitial}>
                  {friend.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {userProfile.friends.length > 4 && (
              <TouchableOpacity style={styles.moreFriends}>
                <Text style={styles.moreFriendsText}>
                  +{userProfile.friends.length - 4}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.noFriendsText}>
            You haven't added any friends yet. Tap 'Add' to find friends.
          </Text>
        )}

        {/* Logout button */}
        <AppButton
          title={loggingOut ? "Logging out..." : "Logout"}
          onPress={handleLogout}
          disabled={loggingOut}
        />
      </View>

      {/* Friend search modal */}
      <Modal
        visible={showFriendSearch}
        animationType="slide"
        onRequestClose={() => setShowFriendSearch(false)}
      >
        <FriendSearch onClose={() => setShowFriendSearch(false)} />
      </Modal>
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
    justifyContent: "center",
    alignItems: "center",
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
    flex: 1,
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
    marginBottom: 30,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.medium,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  moreFriends: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  moreFriendsText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "bold",
  },
  noFriendsText: {
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 30,
  },
});
