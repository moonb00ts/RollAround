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
          favoriteSpots: [],
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
        favoriteSpots: [],
      });
    }
  };

  // Handle navigation based on auth state ************************
  const handleAuthStateChange = (currentUser) => {
    console.log(
      "Auth state changed:",
      currentUser ? "logged in" : "logged out"
    );

    // Update user state
    setUser(currentUser);

    // Store auth state
    storeAuthState(!!currentUser);

    // Handle navigation only if we're initialized
    if (initialized) {
      if (currentUser) {
        // User is logged in, navigate to tabs
        console.log("Navigating to tabs");
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 100);
      } else {
        // User is logged out, navigate to login
        console.log("Navigating to login");
        setTimeout(() => {
          router.push("/");
        }, 100);
      }
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
        favoriteSkateparks: [],
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
      // First clear our states
      setUserProfile(null);

      // Then sign out from Firebase
      await signOut(auth);
      console.log("Firebase signout complete");

      // Auth state listener will handle the rest
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  // Friend request functions
  const sendFriendRequest = async (friendId) => {
    if (!user) return;

    try {
      // Add to recipient's friendRequests array
      const friendRef = doc(firestore, "users", friendId);
      await updateDoc(friendRef, {
        friendRequests: arrayUnion({
          userId: user.uid,
          displayName: user.displayName || userProfile.displayName,
          status: "pending",
          timestamp: new Date(),
        }),
      });

      return true;
    } catch (error) {
      console.error("Error sending friend request:", error);
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
      const usersRef = collection(firestore, "users");

      // Search by displayName
      const q = query(
        usersRef,
        where("displayName", ">=", searchTerm),
        where("displayName", "<=", searchTerm + "\uf8ff")
      );

      const querySnapshot = await getDocs(q);
      const results = [];

      querySnapshot.forEach((doc) => {
        // Don't include current user in results
        if (doc.id !== user.uid) {
          const userData = doc.data();

          // Check if this user is already a friend
          const isFriend = userProfile.friends.some(
            (friend) => friend.userId === doc.id
          );

          // Check if we've already sent a request to this user
          const requestSent = userData.friendRequests?.some(
            (req) => req.userId === user.uid
          );

          results.push({
            id: doc.id,
            displayName: userData.displayName,
            isFriend,
            requestSent,
          });
        }
      });

      return results;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
