import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
import colors from "../components/config/colors";


export default function AppLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.light,
            borderTopColor: colors.medium,
            height: Platform.OS === "ios" ? 90 : 60, // Increased height for iOS to account for safe area
            paddingBottom: Platform.OS === "ios" ? 30 : 10, // Add padding at the bottom for iOS
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: "#ffffff",
          tabBarItemStyle: {
            paddingVertical: 5,
          },
          tabBarLabelStyle: {
            paddingBottom: Platform.OS === "ios" ? 0 : 5,
          },
        }}
      >
        <Tabs.Screen
          name="feed"
          options={{
            tabBarLabel: "Feed",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: "Spots",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="whatsOn"
          options={{
            tabBarLabel: "Events",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
