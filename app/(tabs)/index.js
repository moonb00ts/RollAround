import React, { useRef, useState, useEffect, useMemo } from "react";
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
import { useAuth } from "../context/authContext";

export default function SpotsMap() {
  // Always call these hooks, regardless of authentication
  const router = useRouter();
  const { user, loading } = useAuth();
  const map = useRef(null);
  const [spots, setSpots] = useState([]);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationPermission, setLocationPermission] = useState(null);

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
      <MapView
        ref={map}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
      >
        {spots.map((spot) => {
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
    marginTop: 5,
  },
  viewDetailsText: {
    color: colors.dark,
    fontSize: 12,
    marginTop: 5,
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
});
