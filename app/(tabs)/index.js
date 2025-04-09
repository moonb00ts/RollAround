import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Image,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Callout } from "react-native-maps";
import { spotService } from "../services/api";
import colors from "../components/config/colors";
import AppButton from "../components/AppButton";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";

export default function SpotsMap() {
  // Always call these hooks, regardless of authentication
  const router = useRouter();
  const { user, loading } = useAuth();
  const map = useRef(null);
  const [spots, setSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationPermission, setLocationPermission] = useState(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Navigation effect
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  // Fetch spots effect
  useEffect(() => {
    const fetchSpots = async () => {
      if (!user) return;

      try {
        const response = await spotService.getAllSpots();
        if (response.data) {
          const validSpots = response.data.filter(
            (spot) =>
              spot?.location?.coordinates &&
              Array.isArray(spot.location.coordinates) &&
              spot.location.coordinates.length === 2
          );
          setSpots(validSpots);
          setFilteredSpots(validSpots);
        }
      } catch (error) {
        console.error("Error fetching spots:", error);
        Alert.alert("Error", "Failed to load spots. Please try again.");
      }
    };

    fetchSpots();
  }, [user]);

  // Memoize refresh handler
  const handleRefresh = useMemo(
    () => async () => {
      try {
        const response = await spotService.getAllSpots();
        if (response.data) {
          const validSpots = response.data.filter(
            (spot) =>
              spot?.location?.coordinates &&
              Array.isArray(spot.location.coordinates) &&
              spot.location.coordinates.length === 2
          );
          setSpots(validSpots);
          setFilteredSpots(validSpots);
        }
        Alert.alert("Success", "Spots updated successfully!");
      } catch (error) {
        console.error("Error refreshing spots:", error);
        Alert.alert("Error", "Failed to refresh spots. Please try again.");
      }
    },
    []
  );

  // Location permission effect
  useEffect(() => {
    const requestLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
    };

    requestLocationPermission();
  }, []);

  // Search handler
  const handleSearch = () => {
    setIsSearching(true);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = spots.filter(
      (spot) =>
        spot.name.toLowerCase().includes(query) ||
        (spot.description && spot.description.toLowerCase().includes(query)) ||
        (spot.spotType && spot.spotType.toLowerCase().includes(query)) ||
        (spot.location?.address &&
          spot.location.address.toLowerCase().includes(query))
    );

    setSearchResults(results);
    setIsSearching(false);
  };

  // Handle search result selection
  const handleSelectSpot = (spot) => {
    if (spot?.location?.coordinates) {
      // Navigate to the spot on the map
      const newRegion = {
        latitude: spot.location.coordinates[1],
        longitude: spot.location.coordinates[0],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      if (map.current) {
        map.current.animateToRegion(newRegion, 1000);
      }

      // Close the search modal
      setSearchModalVisible(false);

      // Optionally highlight the spot or show its callout
      // You could add state to track the selected spot
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  // Center on user function
  const centerOnUser = async () => {
    if (locationPermission !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please enable location services to use this feature"
      );
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      if (map.current) {
        map.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please check your device settings."
      );
    }
  };

  // If loading or no user, return null to maintain consistent hook calls
  if (loading || !user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Ionicons name="refresh" size={24} color={colors.white} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => setSearchModalVisible(true)}
      >
        <Ionicons name="search" size={24} color={colors.white} />
      </TouchableOpacity>

      <MapView
        ref={map}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
      >
        {filteredSpots.map((spot) => {
          if (!spot?.location?.coordinates) return null;

          return (
            <Marker
              key={spot._id}
              coordinate={{
                latitude: spot.location.coordinates[1],
                longitude: spot.location.coordinates[0],
              }}
              title={spot.name}
              description={spot.description}
            >
              <View style={styles.customMarker}>
                <View
                  style={[
                    styles.markerDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
              </View>

              <Callout
                onPress={() => {
                  // Navigate to spot details when callout is pressed
                  router.push(`/spot/${spot._id}`);
                }}
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{spot.name}</Text>
                  <Text style={styles.calloutType}>{spot.spotType}</Text>
                  <Text style={styles.calloutDescription} numberOfLines={2}>
                    {spot.description}
                  </Text>
                  {spot.images?.length > 0 && (
                    <Image
                      source={{ uri: spot.images[0].url }}
                      style={styles.calloutImage}
                    />
                  )}
                  <Text style={styles.viewDetailsText}>
                    Tap to view details
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.buttonContainer}>
        <AppButton title="Find spots near me" onPress={centerOnUser} />
        <AppButton
          title="Add a spot"
          onPress={() => router.push("../addSpot")}
        />
      </View>

      {/* Search Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={searchModalVisible}
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Spots</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSearchModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, type, or location"
                placeholderTextColor={colors.secondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearSearch}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalSearchButton}
                onPress={handleSearch}
              >
                <Ionicons name="search" size={20} color={colors.dark} />
              </TouchableOpacity>
            </View>

            {isSearching ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <KeyboardAvoidingView style={styles.resultsContainer}>
                {searchResults.map((spot) => (
                  <TouchableOpacity
                    key={spot._id}
                    style={styles.resultItem}
                    onPress={() => handleSelectSpot(spot)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{spot.name}</Text>
                      {spot.spotType && (
                        <Text style={styles.resultType}>{spot.spotType}</Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </KeyboardAvoidingView>
            ) : searchQuery.length > 0 ? (
              <View style={styles.emptyResults}>
                <Ionicons name="search" size={40} color={colors.secondary} />
                <Text style={styles.emptyText}>No spots found</Text>
              </View>
            ) : (
              <View style={styles.searchPrompt}>
                <Ionicons name="search" size={40} color={colors.secondary} />
                <Text style={styles.promptText}>
                  Search for spots by name, type, or location
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    gap: 10,
  },
  customMarker: {
    padding: 5,
    backgroundColor: "white",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.medium,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  callout: {
    width: 200,
    padding: 5,
    display: "flex",
    justifyContent: "center",
  },
  calloutTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
    fontFamily: "SubwayBerlinSC",
  },
  calloutType: {
    fontSize: 14,
    color: colors.medium,
    marginBottom: 5,
  },
  calloutImage: {
    width: 190,
    height: 100,
    borderRadius: 5,
    marginTop: 5,
  },
  viewDetailsText: {
    color: colors.dark,
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  refreshButton: {
    position: "absolute",
    top: 55,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.secondary,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButton: {
    position: "absolute",
    top: 55,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.secondary,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.dark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    minHeight: Dimensions.get("window").height * 0.8,
    maxHeight: Dimensions.get("window").height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 24,
    fontFamily: "SubwayBerlinSC",
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.medium,
    color: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  clearButton: {
    position: "absolute",
    right: 60,
    padding: 10,
  },
  modalSearchButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: colors.secondary,
    fontSize: 16,
  },
  resultsContainer: {
    padding: 10,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.medium,
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  resultType: {
    color: colors.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  resultAddress: {
    color: colors.secondary,
    fontSize: 12,
  },
  emptyResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  searchPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  promptText: {
    color: colors.secondary,
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
  },
});
