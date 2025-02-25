import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Callout } from "react-native-maps";
import { spotService } from "../services/api";
import colors from "../components/config/colors";
import AppButton from "../components/AppButton";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SpotsMap() {
  // Initialize router for navigation
  const router = useRouter();

  // Create map reference
  const map = useRef(null);

  const [spots, setSpots] = useState([]);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const fetchSpots = async () => {
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
      }
    } catch (error) {
      console.error("Error fetching spots:", error);
      Alert.alert("Error", "Failed to load spots. Please try again.");
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    fetchSpots();
  }, []);

  // Refresh function now just calls fetchSpots with a loading indicator
  const handleRefresh = async () => {
    await fetchSpots();
    Alert.alert("Success", "Spots updated successfully!");
  };

  const centerOnUser = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location services to use this feature"
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      // Add safety check before animating
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Ionicons name="refresh" size={24} color={colors.white} />
      </TouchableOpacity>
      <MapView
        ref={map} // Added ref connection to MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {spots.map((spot) => {
          // Add safety check for each marker
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

              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{spot.name}</Text>
                  <Text style={styles.calloutType}>{spot.spotType}</Text>
                  <Text style={styles.calloutType}>{spot.description}</Text>
                  {spot.images?.length > 0 && (
                    <Image
                      source={{ uri: spot.images[0].url }}
                      style={styles.calloutImage}
                    />
                  )}
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
    borderWidth: 1,
    borderColor: colors.medium,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  callout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  calloutType: {
    fontSize: 14,
    color: colors.medium,
    marginBottom: 5,
  },
  calloutImage: {
    width: 180,
    height: 100,
    borderRadius: 5,
  },
  refreshButton: {
    // Position the button absolutely within the SafeAreaView
    position: "absolute",
    // Place it 60 pixels from the top to account for the status bar
    top: 55,
    // Place it 20 pixels from the right edge
    left: 10,
    // Make it a circle with equal width and height
    width: 40,
    height: 40,
    borderRadius: 20,
    // Center the icon inside the button
    justifyContent: "center",
    alignItems: "center",
    // Give it a background color
    backgroundColor: colors.secondary,
    // Make sure it appears above the map
    zIndex: 2,
    // Add a shadow effect to make it appear to float
    // iOS shadow properties
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android elevation
    elevation: 5,
  },
});
