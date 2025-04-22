import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "./context/authContext";
import BlockedUsersScreen from "./components/BlockedUsersScreen";

export default function BlockedUsersRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // If not logged in, redirect to login
  if (!user) {
    return <Redirect href="/" />;
  }

  // User is authenticated, show blocked users screen
  return <BlockedUsersScreen />;
}
