
import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useAuth } from "./context/authContext";
import { router } from "expo-router";
import colors from "./components/config/colors";

export default function LogoutScreen() {
  const { logout } = useAuth();

  useEffect(() => {
    async function handleLogout() {
      try {
        await logout();
        router.replace("/");
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    handleLogout();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.dark,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.white, marginTop: 20 }}>Logging out...</Text>
    </View>
  );
}
