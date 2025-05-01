import { createContext, useState, useContext, useEffect } from "react";
import { auth, firestore } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
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
  const [initialised, setinitialised] = useState(false);
  const [authError, setAuthError] = useState(null);

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
    if (!userId) return null;

    try {
      console.log("Fetching user profile for:", userId);
      const userRef = doc(firestore, "users", userId);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        console.log("User profile found");
        const userData = userSnapshot.data();
        setUserProfile(userData);
        return userData;
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

        try {
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
          return newProfile;
        } catch (error) {
          console.error("Error creating new profile:", error);
          // Still return the profile even if saving failed
          setUserProfile(newProfile);
          return newProfile;
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Create a default profile to prevent null references
      const defaultProfile = {
        displayName: "",
        friends: [],
        friendRequests: [],
        createdAt: new Date(),
        favouriteSpots: [],
      };
      setUserProfile(defaultProfile);
      return defaultProfile;
    }
  };

  // navigation function
  const safeNavigate = (route) => {
    try {
      router.replace(route);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  // Handle auth state changes
  const handleAuthStateChange = (currentUser) => {
    try {
      console.log(
        "Auth state changed:",
        currentUser ? "logged in" : "logged out"
      );
      console.log("initialised state:", initialised);

      // Update user state
      setUser(currentUser);

      // Store auth state (async, but don't await)
      storeAuthState(!!currentUser);

      // Set initialised to true after the first auth state change
      setinitialised(true);

      // Navigation is now done in a separate effect to avoid race conditions
    } catch (error) {
      console.error("Error in handleAuthStateChange:", error);
      // Still mark as initialised even if there's an error
      setinitialised(true);
    }
  };

  // Effect for initial auth check
  useEffect(() => {
    const checkInitialAuthState = async () => {
      try {
        const { isAuthenticated } = await getStoredAuthState();
        if (!isAuthenticated) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in checkInitialAuthState:", error);
        setLoading(false);
      }
    };

    checkInitialAuthState();
  }, []);

  // Effect for Firebase auth listener
  useEffect(() => {
    console.log("Setting up auth listener");
    let isMounted = true;
    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!isMounted) return;

          try {
            // First update the user state
            setUser(currentUser);

            // Then fetch profile if needed
            if (currentUser) {
              await fetchUserProfile(currentUser.uid);
            } else {
              setUserProfile(null);
            }

            // Update auth state
            handleAuthStateChange(currentUser);
          } catch (error) {
            console.error("Error processing auth state change:", error);
          } finally {
            // Always update these flags
            if (isMounted) {
              setLoading(false);
            }
          }
        },
        (error) => {
          console.error("Firebase auth error:", error);
          if (isMounted) {
            setAuthError(error.message);
            setLoading(false);
          }
        }
      );
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      if (isMounted) {
        setAuthError(error.message);
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error in auth unsubscribe:", error);
      }
    };
  }, []); // Remove dependency on initialised

  // Handle navigation based on auth state
  useEffect(() => {
    if (initialised && !loading) {
      if (user) {
        // User is logged in, navigate to tabs
        console.log("Navigating to tabs");
        setTimeout(() => safeNavigate("/(tabs)"), 100);
      } else {
        // User is logged out, navigate to login
        console.log("Navigating to login");
        setTimeout(() => safeNavigate("/"), 100);
      }
    }
  }, [initialised, loading, user]);

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
        favouriteSpots: [],
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
      if (user) {
        console.log(
          "Current user before signout:",
          user.displayName || user.email
        );
      }

      // First clear our states
      setUserProfile(null);

      // Then sign out from Firebase
      await signOut(auth);
      console.log("Firebase signout complete");
      safeNavigate("/");
      // Auth state listener handles rest
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

      // Use the userService.uploadProfilePhoto function
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

      // Store the URL reference in Firestore
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

      //get all users
      const querySnapshot = await getDocs(usersRef);

      // Logs for dev/debugging
      console.log(`Total users in database: ${querySnapshot.size}`);

      
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

      // filter for search
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

  // Add a spot to favourites with better error handling
  const addFavouriteSpot = async (spotId, spotName, spotType) => {
    if (!user) return false;

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

      // Update local state with null safety
      setUserProfile((prev) => {
        if (!prev) return { favouriteSpots: [favouriteSpot] };
        return {
          ...prev,
          favouriteSpots: [...(prev.favouriteSpots || []), favouriteSpot],
        };
      });

      return true;
    } catch (error) {
      console.error("Error adding favourite spot:", error);
      return false;
    }
  };

  // Remove a spot from favourites with better error handling
  const removeFavouriteSpot = async (spotId) => {
    if (!user) return false;

    try {
      const userRef = doc(firestore, "users", user.uid);

      // Find the favourite spot to remove with null safety
      const spotToRemove = userProfile?.favouriteSpots?.find(
        (spot) => spot.spotId === spotId
      );

      if (!spotToRemove) {
        console.warn("Favourite spot not found:", spotId);
        return false;
      }

      // Update Firestore
      await updateDoc(userRef, {
        favouriteSpots: arrayRemove(spotToRemove),
      });

      // Update local state with null safety
      setUserProfile((prev) => {
        if (!prev) return { favouriteSpots: [] };
        return {
          ...prev,
          favouriteSpots: (prev.favouriteSpots || []).filter(
            (spot) => spot.spotId !== spotId
          ),
        };
      });

      return true;
    } catch (error) {
      console.error("Error removing favourite spot:", error);
      return false;
    }
  };

  // Check if a spot is in favourites with null safety
  const isSpotFavourited = (spotId) => {
    if (!userProfile || !userProfile.favouriteSpots) return false;

    return userProfile.favouriteSpots.some((spot) => {
      return spot && spot.spotId === spotId;
    });
  };

  // Block a user
  const blockUser = async (userId) => {
    if (!user) return false;

    try {
      // Get the target user's information
      const targetUserRef = doc(firestore, "users", userId);
      const targetUserSnap = await getDoc(targetUserRef);

      if (!targetUserSnap.exists()) {
        throw new Error("User not found");
      }

      const targetUserData = targetUserSnap.data();
      const blockedUser = {
        userId,
        displayName: targetUserData.displayName || "Unknown User",
        profilePhoto: targetUserData.profilePhoto || null,
        blockedAt: new Date(),
      };

      // Update current user's document to add blocked user
      const userRef = doc(firestore, "users", user.uid);

      // Initialise blockedUsers array if it doesn't exist
      if (!userProfile.blockedUsers) {
        await updateDoc(userRef, {
          blockedUsers: [blockedUser],
        });
      } else {
        // Check if user is already blocked
        if (
          userProfile.blockedUsers.some((blocked) => blocked.userId === userId)
        ) {
          return true; // Already blocked, no action needed
        }

        // Add to blockedUsers array
        await updateDoc(userRef, {
          blockedUsers: arrayUnion(blockedUser),
        });
      }

      // If they were friends, remove from friends list
      const existingFriend = userProfile.friends?.find(
        (friend) => friend.userId === userId
      );
      if (existingFriend) {
        await updateDoc(userRef, {
          friends: arrayRemove(existingFriend),
        });

        // Also remove current user from target user's friends list
        try {
          const currentUserInTargetFriends = targetUserData.friends?.find(
            (friend) => friend.userId === user.uid
          );

          if (currentUserInTargetFriends) {
            await updateDoc(targetUserRef, {
              friends: arrayRemove(currentUserInTargetFriends),
            });
          }
        } catch (error) {
          console.warn("Error removing from target's friends list:", error);
          // Continue anyway as the current user's list was updated
        }
      }

      // Update local state
      setUserProfile((prev) => {
        const updatedProfile = { ...prev };

        // Add to blocked users
        if (!updatedProfile.blockedUsers) {
          updatedProfile.blockedUsers = [blockedUser];
        } else {
          updatedProfile.blockedUsers = [
            ...updatedProfile.blockedUsers.filter((b) => b.userId !== userId),
            blockedUser,
          ];
        }

        // Remove from friends if needed
        if (existingFriend) {
          updatedProfile.friends = updatedProfile.friends.filter(
            (friend) => friend.userId !== userId
          );
        }

        return updatedProfile;
      });

      return true;
    } catch (error) {
      console.error("Error blocking user:", error);
      throw error;
    }
  };

  // Unblock a user
  const unblockUser = async (userId) => {
    if (!user) return false;

    try {
      // Find the blocked user entry to remove
      const blockedUserToRemove = userProfile.blockedUsers?.find(
        (blocked) => blocked.userId === userId
      );

      if (!blockedUserToRemove) {
        return false; // User not blocked, nothing to do
      }

      // Update Firestore
      const userRef = doc(firestore, "users", user.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(blockedUserToRemove),
      });

      // Update local state
      setUserProfile((prev) => ({
        ...prev,
        blockedUsers: prev.blockedUsers.filter(
          (blocked) => blocked.userId !== userId
        ),
      }));

      return true;
    } catch (error) {
      console.error("Error unblocking user:", error);
      throw error;
    }
  };

  // Check if a user is blocked
  const isUserBlocked = (userId) => {
    if (!userProfile || !userProfile.blockedUsers) return false;

    return userProfile.blockedUsers.some(
      (blocked) => blocked.userId === userId
    );
  };

  //Deleting an account: 
  const deleteAccount = async (password) => {
    if (!user) {
      throw new Error("Not authenticated");
    }

    try {
      console.log("Starting account deletion process");

      // First, re-authenticate the user for safety
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Begin deletion process
      setLoading(true);

      // 1. Delete user data from Firestore
      try {
        const userRef = doc(firestore, "users", user.uid);

        // Fetch user data first to get references to user content
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();

          // LATER: Handle deletion of users submitted content?
        
          await updateDoc(userRef, {
            isDeleted: true,
            email: `deleted-${user.uid}@example.com`,
            displayName: "Deleted User",
            deletedAt: new Date(),
            // Preserve metadata for compliance purposes
            originalEmail: user.email,
          });

          console.log("User data marked as deleted in Firestore");
        }
      } catch (firestoreError) {
        console.error(
          "Error handling Firestore data during account deletion:",
          firestoreError
        );
      }

      // 2. Delete the Firebase Authentication account
      await deleteUser(user);
      console.log("Firebase Auth account deleted successfully");

      // 3. Clear local state
      setUser(null);
      setUserProfile(null);

      // 4. Clear stored auth state
      await storeAuthState(false);

      // Account deletion return true
      return true;
    } catch (error) {
      console.error("Error in deleteAccount:", error);

      // Handle specific error cases
      if (error.code === "auth/requires-recent-login") {
        // User needs to sign in again before deleting account
        console.error("Recent authentication required");
      }

      throw error;
    } finally {
      setLoading(false);
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
        updateProfilePhoto,
        addFavouriteSpot,
        removeFavouriteSpot,
        isSpotFavourited,
        authError,
        blockUser,
        unblockUser,
        isUserBlocked,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
