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
        {/* <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View> */}
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
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "80%",
    height: 100,
    marginBottom: 10,
  },
});
