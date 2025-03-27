// app/(tabs)/whatsOn/index.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarStrip from "react-native-calendar-strip";
import moment from "moment";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../components/config/colors";
import { eventService } from "../../services/api";
import { useAuth } from "../../context/authContext";

export default function WhatsOn() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(moment());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (events.length > 0 && selectedDate) {
      // Filter events for the selected date
      const filtered = events.filter((event) => {
        const eventDate = moment(event.date).format("YYYY-MM-DD");
        const selected = selectedDate.format("YYYY-MM-DD");
        return eventDate === selected;
      });
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents([]);
    }
  }, [selectedDate, events]);

  useEffect(() => {
    if (events.length > 0) {
      // Get the next 5 upcoming events
      const upcoming = [...events]
        .filter((event) => moment(event.date).isAfter(moment()))
        .sort((a, b) => moment(a.date).diff(moment(b.date)))
        .slice(0, 5);
      setUpcomingEvents(upcoming);
    } else {
      setUpcomingEvents([]);
    }
  }, [events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getAllEvents();

      if (response.data) {
        setEvents(response.data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      Alert.alert("Error", "Failed to load events. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleAddEvent = () => {
    router.push("/addEvent");
  };

  const handleDateSelected = (date) => {
    setSelectedDate(date);
  };

  const handleEventPress = (event) => {
    // Navigate to event details screen
    router.push(`/event/${event._id}`);
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => handleEventPress(item)}
    >
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.eventImage} />
      )}
      <View style={styles.eventContent}>
        <Text style={styles.eventName}>{item.title}</Text>
        <Text style={styles.eventDetails}>
          {moment(item.date).format("Do MMMM [at] h:mm A")}
        </Text>
        <Text style={styles.eventLocation}>{item.location.address}</Text>
      </View>
    </TouchableOpacity>
  );

  // Get the marked dates for the calendar strip
  const markedDates = events.map((event) => ({
    date: moment(event.date),
    dots: [{ color: colors.primary }],
  }));

  // The title text based on selected date
  const eventsTitle = selectedDate.isSame(moment(), "day")
    ? "Up next:"
    : `Events on ${selectedDate.format("MMMM Do")}:`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.calendarContainer}>
        <CalendarStrip
          scrollable
          style={styles.calendar}
          calendarColor={colors.dark}
          calendarHeaderStyle={styles.calendarHeader}
          dateNumberStyle={styles.dateNumber}
          dateNameStyle={styles.dateName}
          iconContainer={{ flex: 0.1 }}
          highlightDateNumberStyle={styles.highlightDateNumber}
          highlightDateNameStyle={styles.highlightDateName}
          markedDates={markedDates}
          selectedDate={selectedDate}
          onDateSelected={handleDateSelected}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={
            selectedDate.isSame(moment(), "day")
              ? upcomingEvents
              : filteredEvents
          }
          renderItem={renderEventItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.eventsListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.upNextText}>{eventsTitle}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddEvent}
              >
                <Ionicons name="add" size={20} color={colors.dark} />
                <Text style={styles.addButtonText}>Add Event</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="calendar-outline"
                size={40}
                color={colors.secondary}
              />
              <Text style={styles.emptyText}>
                {selectedDate.isSame(moment(), "day")
                  ? "No upcoming events"
                  : `No events on ${selectedDate.format("MMMM Do")}`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    height: 60,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: colors.medium,
    paddingHorizontal: 15,
  },
  logo: {
    height: 40,
    width: "50%",
  },
  calendarContainer: {
    paddingTop: 10,
    overflow: "visible"
  },
  calendar: {
    height: 120,
    paddingTop: 10,
    paddingBottom: 10,
  },
  calendarHeader: {
    color: colors.primary,
    fontFamily: "SubwayBerlinSC",
    fontSize: 24,
  },
  dateNumber: {
    color: "#fff",
    fontSize: 16,
  },
  dateName: {
    color: "#fff",
    fontSize: 12,
  },
  highlightDateNumber: {
    color: colors.dark,
    backgroundColor: colors.primary,
    borderRadius: 15,
    padding: 5,
  },
  highlightDateName: {
    color: colors.primary,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  eventsListContent: {
    padding: 15,
    paddingBottom: 30,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  upNextText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "SubwayBerlinSC",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  addButtonText: {
    color: colors.dark,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  eventCard: {
    backgroundColor: colors.medium,
    borderRadius: 10,
    marginBottom: 15,
    overflow: "hidden",
  },
  eventImage: {
    width: "100%",
    height: 120,
  },
  eventContent: {
    padding: 15,
  },
  eventName: {
    color: colors.primary,
    fontSize: 18,
    fontFamily: "SubwayBerlinSC",
    marginBottom: 5,
  },
  eventDetails: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 3,
  },
  eventLocation: {
    color: colors.secondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    color: colors.secondary,
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
  },
});
