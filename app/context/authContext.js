import { createContext, useState, useContext, useEffect } from "react";
import { auth, firestore } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { userService } from "../services/api";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

// Key for storing auth state
const AUTH_STATE_KEY = "auth_state";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Store auth state in secure storage
  const storeAuthState = async (isAuthenticated) => {
    try {
      await SecureStore.setItemAsync(
        AUTH_STATE_KEY,
        JSON.stringify({ isAuthenticated })
      );
    } catch (error) {
      console.error("Error storing auth state:", error);
    }
  };

  // Get stored auth state
  const getStoredAuthState = async () => {
    try {
      const storedState = await SecureStore.getItemAsync(AUTH_STATE_KEY);
      return storedState ? JSON.parse(storedState) : { isAuthenticated: false };
    } catch (error) {
      console.error("Error getting stored auth state:", error);
      return { isAuthenticated: false };
    }
  };

  // Fetch user profile data from Firestore
  const fetchUserProfile = async (userId) => {
    if (!userId) return;

    try {
      console.log("Fetching user profile for:", userId);
      const userRef = doc(firestore, "users", userId);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        console.log("User profile found");
        const userData = userSnapshot.data();
        setUserProfile(userData);
      } else {
        console.log("No user profile found, creating one");
        // Create profile if it doesn't exist yet
        const newProfile = {
          displayName: "",
          friends: [],
          friendRequests: [],
          createdAt: new Date(),
          favouriteSpots: [],
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile({
        displayName: "",
        friends: [],
        friendRequests: [],
        createdAt: new Date(),
        favouriteSpots: [],
      });
    }
  };

  // Handle navigation based on auth state *
  const handleAuthStateChange = (currentUser) => {
    console.log(
      "Auth state changed:",
      currentUser ? "logged in" : "logged out"
    );
    console.log("Initialized state:", initialized);

    // Update user state
    setUser(currentUser);

    // Store auth state
    storeAuthState(!!currentUser);

    // Always attempt to navigate when auth state changes
    if (currentUser) {
      // User is logged in, navigate to tabs
      console.log("Navigating to tabs");
      router.replace("/(tabs)");
    } else {
      // User is logged out, navigate to login
      console.log("Navigating to login");
      router.replace("/");
    }

    // Set initialized to true after the first auth state change
    setInitialized(true);
  };

  // Check stored auth state on startup
  useEffect(() => {
    const checkInitialAuthState = async () => {
      const { isAuthenticated } = await getStoredAuthState();

      if (!isAuthenticated) {
        setLoading(false);
        // We're already on the login screen
      }
    };

    checkInitialAuthState();
  }, []);

  // Set up auth state listener
  useEffect(() => {
    console.log("Setting up auth listener");
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        await fetchUserProfile(currentUser.uid);
      } else {
        setUserProfile(null);
      }

      handleAuthStateChange(currentUser);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [initialized]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // Auth listener will handle the rest
      return true;
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      throw error;
    }
  };

  const register = async (email, password, username = "") => {
    try {
      setLoading(true);

      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Set display name if provided
      if (username) {
        await updateProfile(userCredential.user, {
          displayName: username,
        });
      }

      // Create a user document in Firestore
      const userRef = doc(firestore, "users", userCredential.user.uid);
      const newProfile = {
        displayName: username || email.split("@")[0],
        email,
        friends: [],
        friendRequests: [],
        createdAt: new Date(),
        favouriteSkateparks: [],
      };

      await setDoc(userRef, newProfile);

      // Auth listener will handle the rest
      return true;
    } catch (error) {
      console.error("Error during registration:", error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    console.log("Logout requested");
    try {
      console.log("Current user before signout:", user.displayName);

      // First clear our states
      setUserProfile(null);

      // Then sign out from Firebase
      await signOut(auth);
      console.log("Firebase signout complete");
      router.replace("/");
      // Auth state listener will handle the rest
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const updateProfilePhoto = async (formData, onProgress = () => {}) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      console.log("Starting profile photo upload with userService");

      // Use the dedicated userService.uploadProfilePhoto function
      const uploadResponse = await userService.uploadProfilePhoto(
        formData,
        (progress) => {
          onProgress(progress / 100);
        }
      );

      if (!uploadResponse || !uploadResponse.url) {
        throw new Error("Upload failed - no URL returned");
      }

      console.log("Image upload successful, URL:", uploadResponse.url);

      // Store only the URL reference in Firestore (not the actual image)
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        profilePhoto: uploadResponse.url,
        updatedAt: new Date(),
      });

      console.log("Firestore profile updated with photo URL reference");

      // Update local userProfile state
      setUserProfile((prevProfile) => ({
        ...prevProfile,
        profilePhoto: uploadResponse.url,
      }));

      return uploadResponse;
    } catch (error) {
      console.error("Error in updateProfilePhoto:", error);
      throw error;
    }
  };

  // Friend request functions
  // Updated sendFriendRequest function for authContext.js
  const sendFriendRequest = async (friendId) => {
    if (!user) return;

    try {
      console.log(`Attempting to send friend request to user: ${friendId}`);

      // Get current user's profile first to provide in the request
      const currentUserRef = doc(firestore, "users", user.uid);
      const currentUserSnap = await getDoc(currentUserRef);

      if (!currentUserSnap.exists()) {
        throw new Error("Your user profile could not be found");
      }

      const currentUserData = currentUserSnap.data();
      const senderName =
        currentUserData.displayName ||
        user.displayName ||
        user.email?.split("@")[0] ||
        "A user";

      console.log(`Sending request as: ${senderName}`);

      // Add to recipient's friendRequests array
      const friendRef = doc(firestore, "users", friendId);

      // Create a friend request object
      const friendRequest = {
        userId: user.uid,
        displayName: senderName,
        status: "pending",
        timestamp: new Date(),
      };

      // Update the friend's document
      await updateDoc(friendRef, {
        friendRequests: arrayUnion(friendRequest),
      });

      console.log("Friend request sent successfully");
      return true;
    } catch (error) {
      console.error("Error sending friend request:", error);
      // Add more detailed error logging
      if (error.code === "permission-denied") {
        console.error(
          "This is a Firebase permissions error. Check your security rules."
        );
      }
      throw error;
    }
  };

  const acceptFriendRequest = async (requesterId) => {
    if (!user) return;

    try {
      // Get requester's profile
      const requesterRef = doc(firestore, "users", requesterId);
      const requesterSnap = await getDoc(requesterRef);
      if (!requesterSnap.exists()) {
        throw new Error("User not found");
      }
      const requesterData = requesterSnap.data();

      // Get current user's profile
      const userRef = doc(firestore, "users", user.uid);

      // Find the request to remove
      const requestToRemove = userProfile.friendRequests.find(
        (req) => req.userId === requesterId
      );

      if (!requestToRemove) {
        throw new Error("Friend request not found");
      }

      // Add each user to the other's friends list
      await updateDoc(userRef, {
        friends: arrayUnion({
          userId: requesterId,
          displayName: requesterData.displayName,
          timestamp: new Date(),
        }),
        // Remove this request from pending requests
        friendRequests: arrayRemove(requestToRemove),
      });

      // Add current user to requester's friends
      await updateDoc(requesterRef, {
        friends: arrayUnion({
          userId: user.uid,
          displayName: userProfile.displayName,
          timestamp: new Date(),
        }),
      });

      // Update local state to reflect changes
      await fetchUserProfile(user.uid);

      return true;
    } catch (error) {
      console.error("Error accepting friend request:", error);
      throw error;
    }
  };

  const rejectFriendRequest = async (requesterId) => {
    if (!user) return;

    try {
      const userRef = doc(firestore, "users", user.uid);

      // Find the request to remove
      const requestToRemove = userProfile.friendRequests.find(
        (req) => req.userId === requesterId
      );

      if (!requestToRemove) {
        throw new Error("Friend request not found");
      }

      // Remove this request from pending requests
      await updateDoc(userRef, {
        friendRequests: arrayRemove(requestToRemove),
      });

      // Update local state
      await fetchUserProfile(user.uid);

      return true;
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      throw error;
    }
  };

  const removeFriend = async (friendId) => {
    if (!user) return;

    try {
      // Find the friend to remove
      const friendToRemove = userProfile.friends.find(
        (friend) => friend.userId === friendId
      );

      if (!friendToRemove) {
        throw new Error("Friend not found");
      }

      // Remove friend from current user's friends list
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        friends: arrayRemove(friendToRemove),
      });

      // Try to remove current user from friend's friends list
      try {
        const friendRef = doc(firestore, "users", friendId);
        const friendSnap = await getDoc(friendRef);

        if (friendSnap.exists()) {
          const friendData = friendSnap.data();
          const userInFriendsList = friendData.friends.find(
            (friend) => friend.userId === user.uid
          );

          if (userInFriendsList) {
            await updateDoc(friendRef, {
              friends: arrayRemove(userInFriendsList),
            });
          }
        }
      } catch (innerError) {
        console.warn(
          "Error removing current user from friend's list:",
          innerError
        );
        // Continue anyway as the friend was removed from user's list
      }

      // Update local state
      await fetchUserProfile(user.uid);

      return true;
    } catch (error) {
      console.error("Error removing friend:", error);
      throw error;
    }
  };

  // Search for users to add as friends
  const searchUsers = async (searchTerm) => {
    try {
      console.log("Starting user search for term:", searchTerm);
      console.log("Current user ID:", user.uid);

      // Check if user profile is available
      if (!userProfile) {
        console.log("Warning: userProfile is null or undefined");
      } else {
        console.log(
          "User profile available, friends count:",
          userProfile.friends?.length || 0
        );
      }

      const usersRef = collection(firestore, "users");

      // First, let's get ALL users to see what's in the database
      const querySnapshot = await getDocs(usersRef);

      // Log the total number of users in the database
      console.log(`Total users in database: ${querySnapshot.size}`);

      // Debug: Log all users for inspection
      const allUsers = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        console.log(
          `User found - ID: ${doc.id}, Name: ${
            userData.displayName || "No display name"
          }`
        );
        allUsers.push({
          id: doc.id,
          ...userData,
        });
      });

      // Now filter for our search
      const searchTermLower = searchTerm.toLowerCase();
      const results = [];

      for (const docData of allUsers) {
        // Skip current user
        if (docData.id === user.uid) {
          console.log(`Skipping current user: ${docData.id}`);
          continue;
        }

        const displayName = docData.displayName || "";
        const email = docData.email || "";

        console.log(
          `Checking user ${docData.id}: displayName="${displayName}", email="${email}"`
        );

        // Check both displayName and email for matches
        if (
          displayName.toLowerCase().includes(searchTermLower) ||
          email.toLowerCase().includes(searchTermLower)
        ) {
          console.log(`Match found for ${docData.id}`);

          // Check if this user is already a friend
          const isFriend =
            userProfile?.friends?.some(
              (friend) => friend.userId === docData.id
            ) || false;

          if (isFriend) {
            console.log(`User ${docData.id} is already a friend`);
          }

          // Check if we've already sent a request to this user
          const requestSent =
            docData.friendRequests?.some((req) => req.userId === user.uid) ||
            false;

          if (requestSent) {
            console.log(`Request already sent to user ${docData.id}`);
          }

          results.push({
            id: docData.id,
            displayName: displayName || email.split("@")[0], // Fallback to email username
            email: docData.email,
            isFriend,
            requestSent,
          });
        }
      }

      console.log(`Returning ${results.length} matching users`);
      return results;
    } catch (error) {
      console.error("Error searching users:", error);
      console.error(error.stack); // Log the full stack trace
      throw error;
    }
  };

  // Add a spot to favourites
  const addFavouriteSpot = async (spotId, spotName, spotType) => {
    if (!user) return;

    try {
      const userRef = doc(firestore, "users", user.uid);

      // Create a favourite spot object
      const favouriteSpot = {
        spotId,
        spotName,
        spotType,
        addedAt: new Date(),
      };

      // Update Firestore
      await updateDoc(userRef, {
        favouriteSpots: arrayUnion(favouriteSpot),
      });

      // Update local state
      setUserProfile((prev) => ({
        ...prev,
        favouriteSpots: [...(prev.favouriteSpots || []), favouriteSpot],
      }));

      return true;
    } catch (error) {
      console.error("Error adding favourite spot:", error);
      throw error;
    }
  };

  // Remove a spot from favourites
  const removeFavouriteSpot = async (spotId) => {
    if (!user) return;

    try {
      const userRef = doc(firestore, "users", user.uid);

      // Find the favourite spot to remove
      const spotToRemove = userProfile.favouriteSpots.find(
        (spot) => spot.spotId === spotId
      );

      if (!spotToRemove) {
        throw new Error("Favourite spot not found");
      }

      // Update Firestore
      await updateDoc(userRef, {
        favouriteSpots: arrayRemove(spotToRemove),
      });

      // Update local state
      setUserProfile((prev) => ({
        ...prev,
        favouriteSpots: prev.favouriteSpots.filter(
          (spot) => spot.spotId !== spotId
        ),
      }));

      return true;
    } catch (error) {
      console.error("Error removing favourite spot:", error);
      throw error;
    }
  };

  // Check if a spot is in favourites
  const isSpotFavourited = (spotId) => {
    if (!userProfile || !userProfile.favouriteSpots) return false;
    return userProfile.favouriteSpots.some((spot) => spot.spotId === spotId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        login,
        logout,
        register,
        loading,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        searchUsers,
        refreshUserProfile: () => fetchUserProfile(user?.uid),
        updateProfilePhoto,
        addFavouriteSpot,
        removeFavouriteSpot,
        isSpotFavourited,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
