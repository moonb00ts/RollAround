// app/index.js
import { useAuth } from "./context/authContext";
import LoginScreen from "./components/LoginScreen";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import colors from "./components/config/colors";

export default function Index() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Always render the login screen when this route is active
  return <LoginScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.dark,
  },
});
