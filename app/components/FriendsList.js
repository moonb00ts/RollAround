import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "./config/colors";
import { useAuth } from "../context/authContext";

const FriendsList = ({ friends, showRemoveButton = true, onFriendPress }) => {
  const { removeFriend } = useAuth();

  const handleRemoveFriend = (friendId, friendName) => {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFriend(friendId);
              Alert.alert("Success", "Friend removed");
            } catch (error) {
              Alert.alert("Error", "Failed to remove friend");
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={onFriendPress ? () => onFriendPress(item) : null}
    >
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          <Text style={styles.avatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.friendName}>{item.displayName}</Text>
      </View>

      {showRemoveButton && (
        <TouchableOpacity
          style={styles.removeFriendButton}
          onPress={() => handleRemoveFriend(item.userId, item.displayName)}
        >
          <Ionicons name="person-remove" size={18} color={colors.dark} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={friends}
      renderItem={renderFriend}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No friends found</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
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
  removeFriendButton: {
    backgroundColor: colors.secondary,
    padding: 8,
    borderRadius: 15,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: colors.secondary,
    fontSize: 16,
  },
});

export default FriendsList;
