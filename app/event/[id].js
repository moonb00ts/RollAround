// app/event/[id].js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import moment from "moment";
import colors from "../components/config/colors";
import { eventService } from "../services/api";
import { useAuth } from "../context/authContext";

export default function EventDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEvent(id);
      setEvent(response.data);
    } catch (error) {
      console.error("Error fetching event details:", error);
      setError("Failed to load event details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const openMaps = () => {
    if (!event || !event.location || !event.location.coordinates) return;

    const { coordinates } = event.location;
    const lat = coordinates[1];
    const lng = coordinates[0];
    const label = event.title;

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });

    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color={colors.secondary} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchEventDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color={colors.secondary} />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const eventDate = moment(event.date);
  const isEventPassed = eventDate.isBefore(moment());

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        {event.image ? (
          <Image source={{ uri: event.image }} style={styles.eventImage} />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons
              name="calendar-outline"
              size={60}
              color={colors.secondary}
            />
            <Text style={styles.noImageText}>No image available</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              {eventDate.format("dddd, MMMM Do YYYY, h:mm A")}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>{event.location.address}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Organized by {event.organizer?.username || "Anonymous"}
            </Text>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>About this event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: event.location.coordinates[1],
                longitude: event.location.coordinates[0],
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: event.location.coordinates[1],
                  longitude: event.location.coordinates[0],
                }}
              />
            </MapView>
            <TouchableOpacity style={styles.openMapButton} onPress={openMaps}>
              <Ionicons name="navigate" size={16} color={colors.dark} />
              <Text style={styles.openMapText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom section with share option could go here if needed in future */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.dark,
  },
  loadingText: {
    color: colors.white,
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.dark,
    padding: 20,
  },
  errorText: {
    color: colors.white,
    marginTop: 15,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.dark,
    fontWeight: "bold",
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  eventImage: {
    width: "100%",
    height: 250,
  },
  noImageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: colors.medium,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    color: colors.secondary,
    marginTop: 10,
  },
  contentContainer: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 24,
    color: colors.white,
    fontWeight: "bold",
    marginBottom: 20,
    fontFamily: "SubwayBerlinSC",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  infoText: {
    color: colors.white,
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 10,
    fontWeight: "bold",
  },
  description: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 24,
  },
  mapContainer: {
    marginBottom: 30,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  openMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "center",
  },
  openMapText: {
    color: colors.dark,
    fontWeight: "bold",
    marginLeft: 5,
  },
});
