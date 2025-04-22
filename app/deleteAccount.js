import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "./context/authContext";
import DeleteAccountScreen from "./components/DeleteAccountScreen";

export default function DeleteAccountRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // If not logged in, redirect to login
  if (!user) {
    return <Redirect href="/" />;
  }

  // User is authenticated, show delete account screen
  return <DeleteAccountScreen />;
}
