import React, { useState, useEffect } from "react";
import { View, Image, Text, StyleSheet, ActivityIndicator } from "react-native";
import { fetchUserProfileWithCache } from "../hooks/useUserProfile";
import colors from "./config/colors";

/**
 * A reusable avatar component that handles fetching and displaying user profile photos
 *
 * @param {Object} props Component props
 * @param {string} props.userId User ID for fetching profile (priority over name)
 * @param {string} props.displayName Display name for fallback initial
 * @param {string} props.profilePhoto Direct profile photo URL (optional)
 * @param {number} props.size Size of the avatar in pixels (default: 40)
 * @param {Object} props.style Additional styles for the avatar container
 * @param {boolean} props.showLoading Whether to show loading indicator
 */
const UserAvatar = ({
  userId,
  displayName = "",
  profilePhoto = null,
  size = 40,
  style = {},
  showLoading = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profilePhoto);
  const [name, setName] = useState(displayName);

  useEffect(() => {
    // Update the photoUrl if profilePhoto prop changes
    if (profilePhoto) {
      setPhotoUrl(profilePhoto);
    }
  }, [profilePhoto]);

  useEffect(() => {
    // If we already have a direct photo URL, don't fetch
    if (profilePhoto) {
      setPhotoUrl(profilePhoto);
      return;
    }

    // Only fetch if we have a userId
    if (userId) {
      let isMounted = true;
      setLoading(true);

      fetchUserProfileWithCache(userId)
        .then((profile) => {
          if (!isMounted) return;

          if (profile) {
            if (profile.profilePhoto) {
              setPhotoUrl(profile.profilePhoto);
            }
            if (profile.displayName && !displayName) {
              setName(profile.displayName);
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching profile for avatar:", err);
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [userId, displayName, profilePhoto]);

  const getInitial = () => {
    if (!name || typeof name !== "string" || !name.trim()) {
      return "?";
    }
    return name.trim().charAt(0).toUpperCase();
  };

  const dynamicStyles = {
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    initial: {
      fontSize: size * 0.4, // Scale font size with avatar size
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container, style]}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initial, dynamicStyles.initial]}>
          {getInitial()}
        </Text>
      )}

      {loading && showLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.medium,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initial: {
    color: colors.white,
    fontWeight: "bold",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default UserAvatar;
