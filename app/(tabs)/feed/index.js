import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityCard } from "../../components/ActivityCard";
import AppText from "../../components/AppText";
import colors from "../../components/config/colors";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/authContext";
import { firestore } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

SplashScreen.preventAutoHideAsync();

export default function Home() {
  const router = useRouter();
  const { user, userProfile, acceptFriendRequest, rejectFriendRequest } =
    useAuth();
  const [fontsLoaded] = useFonts({
    SubwayBerlinSC: require("../../../assets/fonts/SubwayBerlinSC.ttf"),
  });

  const [activeTab, setActiveTab] = useState("activity"); // "activity" or "notifications"
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Default activities
  const defaultActivities = [
    {
      name: "Joe Haskins",
      action: "Added a new spot in: Clevedon, UK.",
      timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    },
    {
      name: "Bear Myles",
      action: "Added a new clip to a spot: Lloyds ampitheatre.",
      timestamp: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    },
    {
      name: "Archie Turner",
      action: "Added a new clip to a spot: Deaner Slab.",
      timestamp: new Date(Date.now() - 3600000 * 12), // 12 hours ago
    },
  ];

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);

      // Set default activities
      setActivities(defaultActivities);

      // Use default empty array if userProfile isn't loaded yet
      if (!userProfile) {
        console.log("UserProfile not available yet, using empty arrays");
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get friend requests from user profile
      const friendRequests = userProfile?.friendRequests || [];
      console.log(`Found ${friendRequests.length} friend requests`);

      try {
        // Get spot sharing notifications from Firestore
        const notificationsRef = collection(firestore, "notifications");
        const q = query(
          notificationsRef,
          where("to", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const querySnapshot = await getDocs(q);
        const spotNotifications = [];

        querySnapshot.forEach((doc) => {
          spotNotifications.push({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamp to regular date
            createdAt: doc.data().createdAt
              ? doc.data().createdAt.toDate()
              : new Date(),
          });
        });

        console.log(`Found ${spotNotifications.length} spot notifications`);

        // Combine both types of notifications and sort by date
        const allNotifications = [
          ...friendRequests.map((req) => ({
            id: req.userId,
            type: "friend_request",
            from: {
              userId: req.userId,
              displayName: req.displayName,
            },
            status: req.status,
            createdAt: req.timestamp ? req.timestamp.toDate() : new Date(),
          })),
          ...spotNotifications,
        ].sort((a, b) => b.createdAt - a.createdAt);

        setNotifications(allNotifications);
      } catch (firestoreError) {
        console.error(
          "Error fetching notifications from Firestore:",
          firestoreError
        );
        // Still set the friend requests
        setNotifications(
          friendRequests.map((req) => ({
            id: req.userId,
            type: "friend_request",
            from: {
              userId: req.userId,
              displayName: req.displayName,
            },
            status: req.status,
            createdAt: req.timestamp ? req.timestamp.toDate() : new Date(),
          }))
        );
      }
    } catch (error) {
      console.error("Error in fetchNotifications:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    console.log("Triggering fetchNotifications effect");
    fetchNotifications();
  }, [user, userProfile]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(firestore, "notifications", notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });

      // Update the local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      Alert.alert("Error", "Failed to mark notification as read");
    }
  };

  // Handle friend request actions
  const handleFriendRequest = async (requesterId, action) => {
    try {
      if (action === "accept") {
        await acceptFriendRequest(requesterId);
      } else {
        await rejectFriendRequest(requesterId);
      }

      // Remove this notification from the list
      setNotifications((prev) =>
        prev.filter(
          (notification) =>
            !(
              notification.type === "friend_request" &&
              notification.from.userId === requesterId
            )
        )
      );
    } catch (error) {
      console.error(
        `Error ${
          action === "accept" ? "accepting" : "rejecting"
        } friend request:`,
        error
      );
      Alert.alert("Error", `Failed to ${action} friend request`);
    }
  };

  // Navigate to a spot
  const navigateToSpot = (spotId) => {
    // Implement navigation to spot details page
    router.push(`/spot/${spotId}`);
  };

  // Format the timestamp
  const formatTimestamp = (date) => {
    if (!date) return "";

    try {
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      // Less than a day
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours < 1) {
          const minutes = Math.floor(diff / (60 * 1000));
          return minutes < 1 ? "Just now" : `${minutes}m ago`;
        }
        return `${hours}h ago`;
      }

      // Less than a week
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}d ago`;
      }

      // Format as date
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "";
    }
  };

  // Render each activity
  const renderActivity = ({ item }) => (
    <ActivityCard
      activity={{
        name: item.name,
        action: item.action,
        timestamp: formatTimestamp(item.timestamp),
      }}
    />
  );

  // Render each notification
  const renderNotification = ({ item }) => {
    // Friend request notification
    if (item.type === "friend_request") {
      return (
        <View style={styles.notificationItem}>
          <View style={styles.notificationContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.from.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationText}>
                <Text style={styles.boldText}>{item.from.displayName}</Text>{" "}
                sent you a friend request
              </Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(item.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleFriendRequest(item.from.userId, "accept")}
            >
              <Ionicons name="checkmark" size={18} color={colors.dark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleFriendRequest(item.from.userId, "reject")}
            >
              <Ionicons name="close" size={18} color={colors.dark} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Spot shared notification
    if (item.type === "spot_shared") {
      return (
        <TouchableOpacity
          style={[
            styles.notificationItem,
            item.read ? styles.readNotification : null,
          ]}
          onPress={() => {
            if (!item.read) markAsRead(item.id);
            navigateToSpot(item.spotId);
          }}
        >
          <View style={styles.notificationContent}>
            <View
              style={[styles.avatar, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="map" size={20} color={colors.white} />
            </View>
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationText}>
                <Text style={styles.boldText}>{item.from.displayName}</Text>{" "}
                shared the spot "{item.spotName}" with you
              </Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(item.createdAt)}
              </Text>
            </View>
          </View>

          {!item.read && <View style={styles.unreadIndicator} />}
        </TouchableOpacity>
      );
    }

    // Default for any other notification type
    return (
      <View style={styles.notificationItem}>
        <Text style={styles.notificationText}>Unknown notification type</Text>
      </View>
    );
  };

  // Get notification count for badge
  const getNotificationCount = () => {
    return notifications.filter(
      (n) =>
        n.type === "friend_request" || (n.type === "spot_shared" && !n.read)
    ).length;
  };

  // Don't render anything until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "activity" && styles.activeTab]}
          onPress={() => setActiveTab("activity")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "activity" && styles.activeTabText,
            ]}
          >
            Activity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "notifications" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("notifications")}
        >
          <View style={styles.tabWithBadge}>
            <Text
              style={[
                styles.tabText,
                activeTab === "notifications" && styles.activeTabText,
              ]}
            >
              Notifications
            </Text>

            {getNotificationCount() > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {getNotificationCount()}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loading}
        />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={40} color={colors.secondary} />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchNotifications();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === "activity" ? (
        <FlatList
          data={activities}
          renderItem={renderActivity}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No activity yet</Text>
            </View>
          }
          ListFooterComponent={
            activities.length > 0 ? (
              <AppText style={styles.footerText}>That's all for now!</AppText>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="notifications-off"
                size={40}
                color={colors.secondary}
              />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
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
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationBadge: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
    paddingHorizontal: 5,
  },
  notificationBadgeText: {
    color: colors.dark,
    fontSize: 12,
    fontWeight: "bold",
  },
  listContent: {
    flexGrow: 1,
    padding: 10,
  },
  footerText: {
    marginTop: 25,
    fontSize: 25,
    textAlign: "center",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: 16,
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: colors.secondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 15,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: colors.dark,
    fontWeight: "bold",
  },
  // Notification styles
  notificationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: colors.medium,
    borderRadius: 10,
    marginBottom: 10,
  },
  readNotification: {
    opacity: 0.7,
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.medium,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationText: {
    color: colors.white,
    fontSize: 14,
  },
  boldText: {
    fontWeight: "bold",
    color: colors.primary,
  },
  timestamp: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    marginLeft: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  rejectButton: {
    backgroundColor: colors.secondary,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
