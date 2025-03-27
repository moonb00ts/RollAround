import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import colors from "./config/colors";

const ProfilePhotoUploader = ({ onPhotoUpdated }) => {
  const { user, userProfile, updateProfilePhoto } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Set initial profile image if available in user profile
  useEffect(() => {
    if (userProfile?.profilePhoto) {
      setProfileImage(userProfile.profilePhoto);
    }
  }, [userProfile]);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to set a profile photo."
      );
      return false;
    }
    return true;
  };

  const selectImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0];
        setProfileImage(selectedImage.uri);
        uploadImage(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "There was a problem selecting your image.");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow camera access to take a photo."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const capturedImage = result.assets[0];
        setProfileImage(capturedImage.uri);
        uploadImage(capturedImage.uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "There was a problem capturing your photo.");
    }
  };

  const uploadImage = async (imageUri) => {
    if (!imageUri) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a form data object for the upload
      const formData = new FormData();
      const fileType = imageUri.split(".").pop();
      formData.append("file", {
        uri: imageUri,
        type: `image/${fileType}`,
        name: `profile.${fileType}`,
      });

      // Add user ID to the form data for better backend tracking
      formData.append("userId", user.uid);
      formData.append("type", "profile");

      // Use the updateProfilePhoto function from AuthContext which now uses userService
      const uploadResponse = await updateProfilePhoto(formData, (progress) => {
        setUploadProgress(progress);
      });

      if (uploadResponse && uploadResponse.url) {
        Alert.alert("Success", "Profile photo updated successfully!");

        // Call the callback if provided
        if (onPhotoUpdated) {
          onPhotoUpdated(uploadResponse.url);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        "Failed to update profile photo. Please try again."
      );
      // Keep the local state with the selected image even if upload fails
    } finally {
      setUploading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      "Profile Photo",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: takePhoto,
        },
        {
          text: "Choose from Library",
          onPress: selectImage,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.photoWrapper}>
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={showPhotoOptions}
          disabled={uploading}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                {userProfile?.displayName?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  "?"}
              </Text>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.uploadingText}>
                {Math.round(uploadProgress * 100)}%
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {!uploading && (
          <TouchableOpacity
            style={styles.cameraIconContainer}
            onPress={showPhotoOptions}
            disabled={uploading}
          >
            <Ionicons name="camera" size={22} color={colors.dark} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.helperText}>
        {profileImage
          ? "Tap to change profile photo"
          : "Tap to add profile photo"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  photoWrapper: {
    position: "relative",
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.medium,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.medium,
  },
  placeholderText: {
    fontSize: 48,
    color: colors.white,
    fontWeight: "bold",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.dark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  uploadingOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: colors.white,
    fontSize: 14,
    marginTop: 5,
  },
  helperText: {
    color: colors.secondary,
    fontSize: 14,
    textAlign: "center",
  },
});

export default ProfilePhotoUploader;
