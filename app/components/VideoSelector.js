import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import { spotService } from "../services/api";
import colors from "./config/colors";
import { useAuth } from "../context/authContext";

const VideoSelector = ({ onVideoUploaded, spotId }) => {
  const { user, userProfile } = useAuth();
  const [video, setVideo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [caption, setCaption] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    console.log("🟢 Auth Debug - User:", {
      uid: user?.uid,
      displayName: user?.displayName,
      email: user?.email,
    });
    console.log("🟢 Auth Debug - UserProfile:", userProfile);
  }, [user, userProfile]);

  const pickVideo = async () => {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need access to your media library to upload videos."
        );
        return;
      }

      // Launch video picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 60, // Limit to 60 seconds
      });

      if (!result.canceled) {
        const videoAsset = result.assets[0];
        // Check video size (approximately)
        if (videoAsset.fileSize && videoAsset.fileSize > 50 * 1024 * 1024) {
          // 50MB
          Alert.alert(
            "Video Too Large",
            "Please select a video smaller than 50MB."
          );
          return;
        }

        setVideo({
          uri: videoAsset.uri,
          type: "video/mp4", // Assuming MP4, but this could vary
          name: videoAsset.uri.split("/").pop() || "video.mp4",
        });
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "There was a problem selecting your video.");
    }
  };

  // Get username from auth context
  const getUserName = () => {
    console.log("Getting username from auth context");

    // Try userProfile.displayName first (from Firestore)
    if (userProfile?.displayName) {
      console.log(
        "Using displayName from userProfile:",
        userProfile.displayName
      );
      return userProfile.displayName;
    }

    // Then try user.displayName (from Auth)
    if (user?.displayName) {
      console.log("Using displayName from user:", user.displayName);
      return user.displayName;
    }

    // Then try email
    if (user?.email) {
      const emailName = user.email.split("@")[0];
      console.log("Using name from email:", emailName);
      return emailName;
    }

    // Fallback
    console.log("No username found, using Anonymous");
    return "Anonymous";
  };

  // Replace the uploadVideo function in your VideoSelector component with this version

  const uploadVideo = async () => {
    if (!video) {
      Alert.alert("No Video", "Please select a video first.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Log the entire user object to see what we have
      console.log("User object:", {
        uid: user?.uid,
        displayName: user?.displayName,
        email: user?.email,
      });
      console.log("UserProfile object:", userProfile);

      // Explicitly set the username - make sure it doesn't get lost
      const userName =
        userProfile?.displayName ||
        user?.displayName ||
        (user?.email ? user.email.split("@")[0] : "Anonymous");
      console.log("Using userName:", userName);

      // Step 1: Upload video to Cloudinary
      const formData = new FormData();
      formData.append("file", {
        uri: video.uri,
        type: video.type || "video/mp4",
        name: video.name || "video.mp4",
      });

      console.log("Starting media upload...");
      const uploadResult = await spotService.uploadMedia(
        formData,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      console.log("Video upload successful:", uploadResult);

      // Step 2: Add video to spot
      if (spotId) {
        // Create payload with explicit fields
        const videoData = {
          url: uploadResult.url,
          thumbnail: uploadResult.thumbnail || uploadResult.url,
          caption: caption.trim(),
          description: "",
          userName: userName, // Make sure this is included
          uploadedBy: user?.uid || "unknown",
        };

        // Log the exact payload we're sending
        console.log("Sending video data:", JSON.stringify(videoData, null, 2));

        // Use your existing spotService
        const response = await spotService.addVideoToSpot(spotId, videoData);
        console.log("Server response:", response);
        console.log(
          "Video successfully added to spot with username:",
          userName
        );
      } else {
        console.error("No spotId provided, cannot add video");
        Alert.alert(
          "Error",
          "Could not determine which spot to add this video to."
        );
        setIsUploading(false);
        return;
      }

      // Clear the local state
      setVideo(null);
      setCaption("");
      setUploadProgress(0);

      // Notify parent component
      if (onVideoUploaded) {
        onVideoUploaded();
      }

      Alert.alert("Success", "Video uploaded successfully!");
    } catch (error) {
      console.error("Error uploading video:", error);
      Alert.alert(
        "Upload Failed",
        "There was a problem uploading your video: " + error.message
      );
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setVideo(null);
    setCaption("");
    setUploadProgress(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Video Clip</Text>

      {!video ? (
        <TouchableOpacity style={styles.selectButton} onPress={pickVideo}>
          <Ionicons name="videocam" size={40} color={colors.secondary} />
          <Text style={styles.selectText}>Select Video</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.videoPreviewContainer}>
          <Video
            ref={videoRef}
            source={{ uri: video.uri }}
            style={styles.videoPreview}
            useNativeControls
            resizeMode="contain"
          />

          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption (optional)"
            placeholderTextColor={colors.secondary}
            value={caption}
            onChangeText={setCaption}
            maxLength={100}
            multiline={false}
          />

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={cancelUpload}
              disabled={isUploading}
            >
              <Ionicons name="close" size={20} color={colors.white} />
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.uploadButton]}
              onPress={uploadVideo}
              disabled={isUploading}
            >
              <Ionicons name="cloud-upload" size={20} color={colors.dark} />
              <Text style={[styles.buttonText, { color: colors.dark }]}>
                Upload
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isUploading && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
          <Text style={styles.progressText}>{uploadProgress}% Uploaded</Text>
        </View>
      )}

      <Text style={styles.helperText}>
        Videos should be no longer than 60 seconds
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 10,
  },
  selectButton: {
    backgroundColor: colors.medium,
    borderRadius: 8,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: "dashed",
  },
  selectText: {
    color: colors.secondary,
    marginTop: 10,
    fontSize: 16,
  },
  videoPreviewContainer: {
    marginBottom: 15,
  },
  videoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.black,
  },
  captionInput: {
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 0.48,
  },
  cancelButton: {
    backgroundColor: colors.medium,
  },
  uploadButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    marginLeft: 5,
    fontSize: 14,
    color: colors.white,
    fontWeight: "500",
  },
  progressContainer: {
    marginTop: 10,
    backgroundColor: colors.medium,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  progressText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: colors.white,
    fontSize: 12,
    lineHeight: 20,
  },
  helperText: {
    color: colors.secondary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
});

export default VideoSelector;
