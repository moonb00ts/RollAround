import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

let firebaseConfig = {};

try {
  // Try to get config from Constants
  firebaseConfig = {
    apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "MISSING_API_KEY",
    authDomain:
      Constants.expoConfig?.extra?.firebaseAuthDomain || "MISSING_AUTH_DOMAIN",
    projectId:
      Constants.expoConfig?.extra?.firebaseProjectId || "MISSING_PROJECT_ID",
    storageBucket:
      Constants.expoConfig?.extra?.firebaseStorageBucket ||
      "MISSING_STORAGE_BUCKET",
    messagingSenderId:
      Constants.expoConfig?.extra?.firebaseMessagingSenderId ||
      "MISSING_MESSAGING_SENDER_ID",
    appId: Constants.expoConfig?.extra?.firebaseAppId || "MISSING_APP_ID",
    measurementId:
      Constants.expoConfig?.extra?.firebaseMeasurementId ||
      "MISSING_MEASUREMENT_ID",
  };

  console.log("Firebase config:", JSON.stringify(firebaseConfig));
} catch (error) {
  console.error("Error getting Firebase config:", error);
  // Use a backup config or empty object
  firebaseConfig = {};
}

let app, auth, firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  firestore = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Create dummy objects to prevent crashes
  app = {};
  auth = { currentUser: null };
  firestore = {};
}

export { auth, firestore };
export default app;
