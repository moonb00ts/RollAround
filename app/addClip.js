import React from "react";
import { Stack } from "expo-router";
import { useAuth } from "./context/authContext";
import { Redirect } from "expo-router";
import AddClip from "./components/AddClip";

export default function AddClipScreen() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // If not logged in, redirect to login
  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <AddClip />
    </>
  );
}
