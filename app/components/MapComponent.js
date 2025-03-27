import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import colors from "./config/colors";

/**
 * A map component with search functionality and user location tracking
 *
 * @param {Object} props Component props
 * @param {Object} props.initialLocation Initial coordinates {latitude, longitude}
 * @param {Function} props.onLocationChange Callback when location changes
 * @param {Function} props.onAddressChange Callback when address changes
 * @param {string} props.address Current address string
 * @param {boolean} props.showUserLocation Show user's current location marker
 * @param {string} props.placeholder Placeholder text for search input
 * @param {Object} props.mapStyle Additional styles for the map container
 * @param {boolean} props.fullscreen Whether the map should be fullscreen
 */
const MapComponent = ({
  initialLocation,
  onLocationChange,
  onAddressChange,
  address = "",
  showUserLocation = true,
  placeholder = "Search for a location",
  mapStyle = {},
  fullscreen = false,
}) => {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [location, setLocation] = useState(
    initialLocation || {
      latitude: 51.4414,
      longitude: -2.6036,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  );

  // Get user's location on component mount
  useEffect(() => {
    getUserLocation();
  }, []);

  // Convert coordinates to address when location changes
  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      getAddressFromCoordinates(location);
    }
  }, [location]);

  const getUserLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location services to use this feature"
        );
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLoc = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setUserLocation(userLoc);

      // If no initial location was provided, use the user's location
      if (!initialLocation || !initialLocation.latitude) {
        setLocation(userLoc);

        if (onLocationChange) {
          onLocationChange(userLoc);
        }
      }

      // Animate map to user location
      if (mapRef.current) {
        mapRef.current.animateToRegion(userLoc, 1000);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your location. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getAddressFromCoordinates = async (coordinates) => {
    try {
      const [addressData] = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      if (addressData) {
        const formattedAddress = [
          addressData.name,
          addressData.street,
          addressData.city,
          addressData.region,
          addressData.postalCode,
          addressData.country,
        ]
          .filter(Boolean)
          .join(", ");

        if (onAddressChange) {
          onAddressChange(formattedAddress);
        }
      }
    } catch (error) {
      console.error("Error getting address:", error);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const result = await Location.geocodeAsync(searchQuery);

      if (result.length > 0) {
        const { latitude, longitude } = result[0];
        const newLocation = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setLocation(newLocation);

        if (onLocationChange) {
          onLocationChange(newLocation);
        }

        mapRef.current?.animateToRegion(newLocation, 1000);
      } else {
        Alert.alert("Not Found", "No location found with that name");
      }
    } catch (error) {
      console.error("Error searching location:", error);
      Alert.alert("Error", "Failed to search for location");
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (e) => {
    const newLocation = e.nativeEvent.coordinate;
    setLocation(newLocation);

    if (onLocationChange) {
      onLocationChange(newLocation);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    } else {
      getUserLocation();
    }
  };

  return (
    <View style={[styles.container, mapStyle]}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchLocation}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchLocation}
          disabled={loading}
        >
          <Ionicons name="search" size={20} color={colors.dark} />
        </TouchableOpacity>
      </View>

      <View
        style={[styles.mapContainer, fullscreen ? styles.fullscreenMap : null]}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          // Using default provider instead of Google Maps
          initialRegion={location}
          onPress={handleMapPress}
          showsUserLocation={showUserLocation}
        >
          {/* Selected location marker */}
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            pinColor={colors.primary}
            title="Selected Location"
          />

          {/* User's current location marker (if showing separately from built-in blue dot) */}
          {userLocation && !showUserLocation && (
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              pinColor="blue"
              title="Your Location"
            />
          )}
        </MapView>

        {/* Location button */}
        <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
          <Ionicons name="locate" size={22} color={colors.dark} />
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>

      {address ? (
        <View style={styles.addressContainer}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    width: 44,
    borderRadius: 8,
    marginLeft: 8,
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  fullscreenMap: {
    height: Dimensions.get("window").height * 0.5,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  addressText: {
    color: colors.secondary,
    marginLeft: 6,
    fontSize: 14,
    flex: 1,
  },
});

export default MapComponent;
