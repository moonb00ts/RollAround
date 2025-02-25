import { useAuth } from "./context/authContext";
import { Redirect } from "expo-router";
import AddSpotScreen from "./components/AddSpotScreen"; // Your spot adding UI

export default function AddSpot() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // If not logged in, redirect to login
  if (!user) {
    return <Redirect href="/" />;
  }

  // User is authenticated, show add spot screen
  return <AddSpotScreen />;
}
