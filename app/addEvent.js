// app/addEvent.js
import { useAuth } from "./context/authContext";
import { Redirect } from "expo-router";
import EventForm from "./components/EventForm"; // Our event creation form

export default function AddEvent() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // If not logged in, redirect to login
  if (!user) {
    return <Redirect href="/" />;
  }

  // User is authenticated, show add event form
  return <EventForm />;
}
