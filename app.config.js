import "dotenv/config";

export default {
  expo: {
    name: "RollAround",
    slug: "RollAround",
    version: "1.0.0",
    scheme: "rollaround",
    newArchEnabled: true,
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID,
      eas: {
        projectId: "34f3c528-f2ec-4c28-9df7-38ddeb048992",
      },
    },

    android: {
      package: "com.rollAround.rollAround",
    },

    ios: {
      bundleIdentifier: "com.rollAround.app",
      icon: "./assets/images/icon.png",
    },

    owner: "moonb00ts",
  },
};
