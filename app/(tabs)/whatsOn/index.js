import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarStrip from "react-native-calendar-strip";
import moment from "moment";
import colors from "../../components/config/colors";
import { Image } from "react-native";

export default function WhatsOn() {
  const [selectedDate, setSelectedDate] = useState(moment());

  const events = [
    {
      name: "DLH Funday",
      date: "2025-08-23",
      location: "Dean Lane Skatepark",
    },
    {
      name: "Rerun Pop-up Sale",
      date: "2025-09-24",
      location: "Dean Lane Slab",
    },
  ];

  const markedDates = events.map((event) => ({
    date: moment(event.date),
    dots: [{ color: colors.primary }],
  }));

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
          onDateSelected={(date) => setSelectedDate(date)}
        />
      </View>

      <View style={styles.eventsContainer}>
        <Text style={styles.upNextText}>Up next:</Text>
        {events.map((event, index) => (
          <View key={index} style={styles.eventCard}>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventDetails}>
              {moment(event.date).format("Do MMMM")}, {event.location}
            </Text>
          </View>
        ))}
      </View>
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
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  logo: {
    height: 40,
    width: "50%",
  },
  calendarContainer: {
    paddingTop: 20,
  },
  calendar: {
    height: 150,
    paddingTop: 20,
    paddingBottom: 20,
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
  eventsContainer: {
    padding: 20,
    flex: 1,
  },
  upNextText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "SubwayBerlinSC",
    marginBottom: 10,
  },
  eventCard: {
    backgroundColor: colors.medium,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
  },
});
