import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import colors from "./config/colors";
import { firestore } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const ShareSpot = ({ isVisible, onClose, spot }) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);

  const toggleFriendSelection = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter((id) => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert(
        "No Friends Selected",
        "Please select at least one friend to share with."
      );
      return;
    }

    setLoading(true);
    try {
      // Create a notification for each selected friend
      const notifications = selectedFriends.map(async (friendId) => {
        const notificationRef = collection(firestore, "notifications");
        await addDoc(notificationRef, {
          type: "spot_shared",
          from: {
            userId: user.uid,
            displayName: userProfile.displayName || user.email.split("@")[0],
          },
          to: friendId,
          spotId: spot._id,
          spotName: spot.name,
          read: false,
          createdAt: serverTimestamp(),
        });
      });

      await Promise.all(notifications);
      Alert.alert("Success", "Spot shared with selected friends!");
      onClose();
    } catch (error) {
      console.error("Error sharing spot:", error);
      Alert.alert("Error", "Failed to share spot with friends");
    } finally {
      setLoading(false);
    }
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => toggleFriendSelection(item.userId)}
    >
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          <Text style={styles.avatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.friendName}>{item.displayName}</Text>
      </View>
      <View
        style={[
          styles.checkbox,
          selectedFriends.includes(item.userId) && styles.checkboxSelected,
        ]}
      >
        {selectedFriends.includes(item.userId) && (
          <Ionicons name="checkmark" size={16} color={colors.dark} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Share Spot</Text>
          </View>

          {spot && (
            <View style={styles.spotInfo}>
              <Text style={styles.spotName}>{spot.name}</Text>
              <Text style={styles.spotType}>{spot.spotType}</Text>
            </View>
          )}

          <Text style={styles.subtitle}>Select friends to share with:</Text>

          {userProfile?.friends && userProfile.friends.length > 0 ? (
            <FlatList
              data={userProfile.friends}
              renderItem={renderFriendItem}
              keyExtractor={(item) => item.userId}
              style={styles.friendsList}
            />
          ) : (
            <View style={styles.emptyFriends}>
              <Text style={styles.emptyText}>
                You don't have any friends to share with yet.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={loading || selectedFriends.length === 0}
          >
            {loading ? (
              <ActivityIndicator color={colors.dark} />
            ) : (
              <>
                <Ionicons name="share-social" size={20} color={colors.dark} />
                <Text style={styles.shareButtonText}>
                  Share with {selectedFriends.length} friend
                  {selectedFriends.length !== 1 ? "s" : ""}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.dark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  closeButton: {
    marginRight: 15,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "SubwayBerlinSC",
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 16,
    marginBottom: 10,
  },
  spotInfo: {
    padding: 15,
    backgroundColor: colors.medium,
    borderRadius: 10,
    marginBottom: 20,
  },
  spotName: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  spotType: {
    color: colors.white,
    fontSize: 14,
  },
  friendsList: {
    maxHeight: 300,
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendAvatar: {
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
  friendName: {
    color: colors.white,
    fontSize: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyFriends: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: colors.secondary,
    fontSize: 16,
    textAlign: "center",
  },
  shareButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  shareButtonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});

export default ShareSpot;
