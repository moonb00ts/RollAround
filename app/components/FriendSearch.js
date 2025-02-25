import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import colors from "./config/colors";

const FriendSearch = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { searchUsers, sendFriendRequest } = useAuth();

  // Clear results when search term is cleared
  useEffect(() => {
    if (searchTerm === "") {
      setResults([]);
      setHasSearched(false);
    }
  }, [searchTerm]);

  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) {
      Alert.alert("Error", "Please enter at least 2 characters to search");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);

    try {
      console.log("Searching for users with term:", searchTerm);
      const searchResults = await searchUsers(searchTerm);
      console.log(`Received ${searchResults.length} results`);
      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search for users");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId);

      // Update the UI to show request was sent
      setResults((prevResults) =>
        prevResults.map((user) =>
          user.id === userId ? { ...user, requestSent: true } : user
        )
      );

      Alert.alert("Success", "Friend request sent!");
    } catch (error) {
      Alert.alert("Error", "Failed to send friend request");
      console.error(error);
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.displayName?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <Text style={styles.username}>{item.displayName}</Text>
      </View>

      <View style={styles.actionContainer}>
        {item.isFriend ? (
          <Text style={styles.friendLabel}>Friends</Text>
        ) : item.requestSent ? (
          <Text style={styles.pendingLabel}>Request Sent</Text>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleSendRequest(item.id)}
          >
            <Ionicons name="person-add" size={16} color={colors.dark} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getEmptyText = () => {
    if (!hasSearched) {
      return "Search for skaters by username";
    }
    if (loading) {
      return "Searching...";
    }
    return "No users found. Try a different search term.";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Find Friends</Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username"
            placeholderTextColor={colors.primary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus={true}
          />
          <TouchableOpacity
            style={[
              styles.searchButton,
              searchTerm.trim().length < 2 && styles.disabledButton,
            ]}
            onPress={handleSearch}
            disabled={searchTerm.trim().length < 2}
          >
            <Ionicons name="search" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loading}
          />
        ) : (
          <FlatList
            data={results}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{getEmptyText()}</Text>
            }
          />
        )}
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  closeButton: {
    marginRight: 15,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontFamily: "SubwayBerlinSC",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 10,
    color: colors.white,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    padding: 10,
  },
  disabledButton: {
    backgroundColor: colors.medium,
    opacity: 0.5,
  },
  resultsList: {
    paddingHorizontal: 15,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 18,
    fontWeight: "bold",
  },
  username: {
    color: colors.white,
    fontSize: 16,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addButtonText: {
    color: colors.dark,
    marginLeft: 5,
    fontWeight: "bold",
  },
  friendLabel: {
    color: colors.primary,
    fontWeight: "bold",
  },
  pendingLabel: {
    color: colors.secondary,
    fontStyle: "italic",
  },
  loading: {
    marginTop: 40,
  },
  emptyText: {
    color: colors.secondary,
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
});

export default FriendSearch;
