import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../components/config/colors";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/authContext";
import FriendSearch from "../../components/FriendSearch";
import ProfilePhotoUploader from "../../components/ProfilePhotoUploader";
import FriendsList from "../../components/FriendsList";
import UserAvatar from "../../components/UserAvatar";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();
  const { logout, userProfile, user, refreshUserProfile } = useAuth();
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState("friends"); // "friends" or "favorites"
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [friends, setFriends] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Set initial profile photo URL and friends
  useEffect(() => {
    if (userProfile) {
      if (userProfile.profilePhoto) {
        setProfilePhotoUrl(userProfile.profilePhoto);
      }
      if (userProfile.friends) {
        setFriends(userProfile.friends);
      }
    }
  }, [userProfile]);

  const displayName =
    userProfile?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Skater";

  const handleLogout = () => {
    router.push("/logout");
  };

  const navigateToSpot = (spotId) => {
    router.push(`/spot/${spotId}`);
  };

  const handlePhotoUpdated = async (photoUrl) => {
    setProfilePhotoUrl(photoUrl);
    // Refresh the user profile to get the updated photo
    await refreshUserProfile();
  };

  // Handler for when a friend is removed
  const handleFriendRemoved = (friendId) => {
    // Update local friends state without needing to refetch from server
    setFriends((prevFriends) =>
      prevFriends.filter((friend) => friend.userId !== friendId)
    );
    // Close the full friends list modal
    setShowAllFriends(false);
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh user profile data
      await refreshUserProfile();

      // Update local state with fresh data
      if (userProfile) {
        if (userProfile.profilePhoto) {
          setProfilePhotoUrl(userProfile.profilePhoto);
        }
        if (userProfile.friends) {
          setFriends(userProfile.friends);
        }
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Render favorite spot item
  const renderFavoriteSpot = ({ item }) => (
    <TouchableOpacity
      style={styles.favoriteSpotItem}
      onPress={() => navigateToSpot(item.spotId)}
    >
      <View style={styles.favoriteSpotInfo}>
        <View style={styles.spotTypeIndicator}>
          <Text style={styles.spotTypeText}>
            {item.spotType?.charAt(0) || "S"}
          </Text>
        </View>
        <Text style={styles.spotName}>{item.spotName}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <ProfilePhotoUploader onPhotoUpdated={handlePhotoUpdated} />
            <Text style={styles.username}>{displayName}</Text>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              Saved spots: {userProfile?.favoriteSpots?.length || 0}
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

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "friends" && styles.activeTab]}
            onPress={() => setActiveTab("friends")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "friends" && styles.activeTabText,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "favorites" && styles.activeTab]}
            onPress={() => setActiveTab("favorites")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "favorites" && styles.activeTabText,
              ]}
            >
              Favorite Spots
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "friends" ? (
          <View style={styles.friendsSection}>
            <View style={styles.friendsHeader}>
              <Text style={styles.friendsTitle}>
                Friends ({friends.length || 0})
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowFriendSearch(true)}
              >
                <Text style={styles.addButtonText}>Add</Text>
                <Ionicons name="person-add" size={20} color={colors.dark} />
              </TouchableOpacity>
            </View>

            {friends.length > 0 ? (
              <>
                <View style={styles.friendsGrid}>
                  {/* Display up to 4 friend avatars using UserAvatar */}
                  {friends.slice(0, 4).map((friend, index) => (
                    <View key={index} style={styles.friendAvatarContainer}>
                      <UserAvatar
                        userId={friend.userId}
                        displayName={friend.displayName}
                        profilePhoto={friend.profilePhoto}
                        size={60}
                      />
                    </View>
                  ))}
                  {/* If more than 4 friends, show count indicator */}
                  {friends.length > 4 && (
                    <View style={styles.moreFriends}>
                      <Text style={styles.moreFriendsText}>
                        +{friends.length - 4}
                      </Text>
                    </View>
                  )}
                </View>

                {/* See all friends button */}
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => setShowAllFriends(true)}
                >
                  <Text style={styles.seeAllButtonText}>See All Friends</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noFriendsText}>
                You haven't added any friends yet. Tap 'Add' to find friends.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.favoritesSection}>
            <Text style={styles.sectionTitle}>
              Favorite Spots ({userProfile?.favoriteSpots?.length || 0})
            </Text>

            {userProfile?.favoriteSpots &&
            userProfile.favoriteSpots.length > 0 ? (
              <FlatList
                data={userProfile.favoriteSpots}
                renderItem={renderFavoriteSpot}
                keyExtractor={(item) => item.spotId}
                scrollEnabled={false}
                nestedScrollEnabled={true}
              />
            ) : (
              <View style={styles.emptyFavorites}>
                <Ionicons
                  name="heart-outline"
                  size={40}
                  color={colors.secondary}
                />
                <Text style={styles.emptyText}>
                  You haven't favorited any spots yet.
                </Text>
                <Text style={styles.emptySubText}>
                  Tap the heart icon on a spot to add it to favorites.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Logout button */}
        <AppButton
          title={loggingOut ? "Logging out..." : "Logout"}
          onPress={handleLogout}
          disabled={loggingOut}
        />
      </ScrollView>

      {/* Friend search modal */}
      <Modal
        visible={showFriendSearch}
        animationType="slide"
        onRequestClose={() => setShowFriendSearch(false)}
      >
        <FriendSearch onClose={() => setShowFriendSearch(false)} />
      </Modal>

      {/* Full friends list modal */}
      <Modal
        visible={showAllFriends}
        animationType="slide"
        onRequestClose={() => setShowAllFriends(false)}
      >
        <SafeAreaView style={styles.fullListContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAllFriends(false)}
            >
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>All Friends</Text>
          </View>

          <FriendsList
            friends={friends}
            showRemoveButton={true}
            onFriendRemoved={handleFriendRemoved}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Add these styles to the existing StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    padding: 10,
  },
  scrollContent: {
    paddingBottom: 20,
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
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  username: {
    color: colors.primary,
    fontSize: 30,
    marginTop: 20,
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
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: "SubwayBerlinSC",
  },
  activeTabText: {
    color: colors.primary,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 20,
    fontFamily: "SubwayBerlinSC",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  friendsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  favoritesSection: {
    marginBottom: 20,
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
    marginBottom: 15,
  },
  friendAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
  },
  moreFriends: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  moreFriendsText: {
    color: colors.dark,
    fontSize: 18,
    fontWeight: "bold",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 20,
  },
  seeAllButtonText: {
    color: colors.primary,
    fontSize: 16,
    marginRight: 5,
  },
  noFriendsText: {
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 30,
  },
  favoriteSpotItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.medium,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  favoriteSpotInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  spotTypeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  spotTypeText: {
    color: colors.dark,
    fontWeight: "bold",
    fontSize: 16,
  },
  spotName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  emptyFavorites: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 15,
  },
  emptySubText: {
    color: colors.secondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
    fontStyle: "italic",
  },
  fullListContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  closeButton: {
    padding: 10,
  },
  modalTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 24,
    fontFamily: "SubwayBerlinSC",
    textAlign: "center",
    marginRight: 40, // Offset for the close button to center the title
  },
});
