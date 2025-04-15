import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../firebase";

/**
 * Custom hook to fetch a user's profile data by userId
 * @param {string} userId - The Firebase userId of the user to fetch
 * @returns {Object} An object containing the loading state, error if any, and the user profile data
 */
export default function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const userRef = doc(firestore, "users", userId);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          setProfile(userData);
        } else {
          // No profile found, set to null
          setProfile(null);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err.message || "Failed to fetch user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  return { profile, loading, error };
}

/**
 * Helper function to fetch a user profile by userId (for one-time use)
 * @param {string} userId - The Firebase userId of the user to fetch
 * @returns {Promise<Object|null>} The user profile data or null if not found
 */
export async function fetchUserProfile(userId) {
  if (!userId) return null;

  try {
    const userRef = doc(firestore, "users", userId);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      return userSnapshot.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Cache for storing user profiles to minimize Firestore reads
 */
const userProfileCache = new Map();

/**
 * Fetch a user profile with caching to reduce Firestore reads
 * @param {string} userId - The Firebase userId of the user to fetch
 * @returns {Promise<Object|null>} The user profile data or null if not found
 */
export async function fetchUserProfileWithCache(userId) {
  if (!userId) return null;

  // Check if we have this user in cache
  if (userProfileCache.has(userId)) {
    const cachedData = userProfileCache.get(userId);
    const cacheTime = cachedData.timestamp;

    // Only use cache if it's less than 5 minutes old
    if (Date.now() - cacheTime < 5 * 60 * 1000) {
      return cachedData.profile;
    }
  }

  try {
    const userRef = doc(firestore, "users", userId);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      const profileData = userSnapshot.data();

      // Cache the result
      userProfileCache.set(userId, {
        profile: profileData,
        timestamp: Date.now(),
      });

      return profileData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}
