import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import colors from "./config/colors";
import { useAuth } from "../context/authContext";
import UserAvatar from "./UserAvatar";

const BlockedUsersScreen = () => {
  const router = useRouter();
  const { userProfile, unblockUser, refreshUserProfile } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load blocked users from profile
  useEffect(() => {
    if (userProfile) {
      setBlockedUsers(userProfile.blockedUsers || []);
    }
  }, [userProfile]);

  const handleUnblock = (userId, displayName) => {
    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            setLoading(true);
            try {
              await unblockUser(userId);

              // Update the local state
              setBlockedUsers((prevUsers) =>
                prevUsers.filter((user) => user.userId !== userId)
              );

              // Refresh the user profile to get the updated blocked users list
              await refreshUserProfile();

              Alert.alert("Success", `${displayName} has been unblocked`);
            } catch (error) {
              console.error("Error unblocking user:", error);
              Alert.alert("Error", "Failed to unblock user. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserProfile();
      if (userProfile) {
        setBlockedUsers(userProfile.blockedUsers || []);
      }
    } catch (error) {
      console.error("Error refreshing blocked users:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderBlockedUser = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <UserAvatar
          userId={item.userId}
          displayName={item.displayName}
          profilePhoto={item.profilePhoto}
          size={48}
        />
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.displayName}</Text>
          <Text style={styles.blockedDate}>
            Blocked on{" "}
            {new Date(item.blockedAt.seconds * 1000).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item.userId, item.displayName)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.dark} />
        ) : (
          <Text style={styles.unblockButtonText}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Users</Text>
        <View style={styles.placeholderRight} />
      </View>

      <FlatList
        data={blockedUsers}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={60}
              color={colors.secondary}
            />
            <Text style={styles.emptyText}>You haven't blocked any users</Text>
            <Text style={styles.emptySubtext}>
              When you block someone, they won't be able to see your content or
              interact with you
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Blocked users cannot see your posts, interact with you, or appear in
          your feeds
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    color: colors.white,
    fontFamily: "SubwayBerlinSC",
  },
  placeholderRight: {
    width: 34, // Balance the back button
  },
  listContent: {
    padding: 15,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.medium,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userDetails: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  blockedDate: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  unblockButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    minWidth: 80,
    alignItems: "center",
  },
  unblockButtonText: {
    color: colors.dark,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    color: colors.white,
    fontSize: 18,
    marginTop: 15,
    textAlign: "center",
  },
  emptySubtext: {
    color: colors.secondary,
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  footer: {
    padding: 15,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: colors.medium,
  },
  footerText: {
    color: colors.secondary,
    fontSize: 12,
    textAlign: "center",
  },
});

export default BlockedUsersScreen;
