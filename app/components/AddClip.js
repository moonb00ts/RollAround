import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Video } from "expo-av";
import colors from "../components/config/colors";
import { firestore } from "../firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/authContext";
import AppText from "../components/AppText";
import { spotService } from "../services/api";

// Get screen dimensions for responsive layout
const { width } = Dimensions.get("window");

export default function CloudinaryAddClip() {
  const router = useRouter();
  const { spotId } = useLocalSearchParams();
  const { user, userProfile } = useAuth();

  // Video ref for controlling video playback
  const videoRef = useRef(null);

  // State for form fields
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [videoUri, setVideoUri] = useState(null);
  const [thumbnailUri, setThumbnailUri] = useState(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadStage, setCurrentUploadStage] = useState("");

  // Spot info
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch spot details
  useEffect(() => {
    const fetchSpotDetails = async () => {
      if (!spotId) {
        Alert.alert("Error", "No spot ID provided");
        router.back();
        return;
      }

      try {
        const spotRef = doc(firestore, "spots", spotId);
        const spotSnap = await getDoc(spotRef);

        if (!spotSnap.exists()) {
          Alert.alert("Error", "Spot not found");
          router.back();
          return;
        }

        setSpot({ id: spotSnap.id, ...spotSnap.data() });
      } catch (error) {
        console.error("Error fetching spot details:", error);
        Alert.alert("Error", "Failed to load spot details");
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [spotId, router]);

  // Generate thumbnail from video
  const generateThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // Get thumbnail from 1 second into the video
        quality: 0.7,
      });
      setThumbnailUri(uri);
      return uri;
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      return null;
    }
  };

  // Pick video from library
  const pickVideo = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "You need to allow access to your media library to pick videos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1.0,
        videoMaxDuration: 60, // Max 60 seconds
      });

      if (!result.canceled) {
        const selectedVideoUri = result.assets[0].uri;

        // Check video duration
        const videoAsset = await Video.createAsync(
          { uri: selectedVideoUri },
          { shouldPlay: false }
        );

        const durationInSeconds = videoAsset.status.durationMillis / 1000;

        if (durationInSeconds > 60) {
          Alert.alert(
            "Video Too Long",
            "Please select a video that is 60 seconds or shorter"
          );
          return;
        }

        setVideoUri(selectedVideoUri);
        await generateThumbnail(selectedVideoUri);
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "There was a problem selecting the video");
    }
  };

  // Handle the complete upload process
  const handleUpload = async () => {
    if (!videoUri) {
      Alert.alert("No Video Selected", "Please select a video to upload");
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        "Missing Information",
        "Please provide a title for your clip"
      );
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload video to server (which sends to Cloudinary)
      setCurrentUploadStage("Uploading video...");

      // Create form data for video upload
      const videoFormData = new FormData();
      const fileType = videoUri.split(".").pop();
      videoFormData.append("file", {
        uri: videoUri,
        type: `video/${fileType}`,
        name: `clip.${fileType}`,
      });

      // Use the existing uploadVideo method in spotService
      const videoResponse = await spotService.uploadVideo(
        videoFormData,
        (progress) => {
          // Video is 70% of total upload progress
          setUploadProgress(progress * 70);
        }
      );

      // 2. Upload thumbnail if available
      let thumbnailResponse = null;
      if (thumbnailUri) {
        setCurrentUploadStage("Uploading thumbnail...");

        const thumbnailFormData = new FormData();
        const thumbType = thumbnailUri.split(".").pop();
        thumbnailFormData.append("file", {
          uri: thumbnailUri,
          type: `image/${thumbType}`,
          name: `thumbnail.${thumbType}`,
        });

        // Use the existing uploadImage method in spotService
        thumbnailResponse = await spotService.uploadImage(
          thumbnailFormData,
          (progress) => {
            // Thumbnail is 20% of total upload progress (starts at 70%)
            setUploadProgress(70 + progress * 20);
          }
        );
      }

      // 3. Save clip data to Firestore
      setCurrentUploadStage("Saving clip data...");
      setUploadProgress(90);

      const clipData = {
        spotId,
        title,
        caption,
        description,
        videoUrl: videoResponse.url,
        videoPublicId: videoResponse.public_id,
        thumbnailUrl: thumbnailResponse?.url || null,
        thumbnailPublicId: thumbnailResponse?.public_id || null,
        userId: user.uid,
        userName:
          userProfile?.displayName || user.email?.split("@")[0] || "Anonymous",
        likeCount: 0,
        commentCount: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
        spotName: spot.name,
      };

      // Add to clips collection
      const clipsRef = collection(firestore, "clips");
      await addDoc(clipsRef, clipData);

      // Final progress
      setUploadProgress(100);

      // Success!
      Alert.alert("Upload Successful", "Your clip has been uploaded!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error uploading clip:", error);
      Alert.alert(
        "Upload Failed",
        "There was a problem uploading your clip. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // Handle close/cancel
  const handleClose = () => {
    if (videoUri) {
      Alert.alert(
        "Discard Changes?",
        "Are you sure you want to go back? Your clip upload will be lost.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <AppText style={styles.title}>Add a Clip</AppText>
          </View>

          {/* Spot info */}
          <View style={styles.spotInfoContainer}>
            <Text style={styles.spotInfoLabel}>Adding clip to:</Text>
            <Text style={styles.spotName}>{spot?.name || "Loading..."}</Text>
          </View>

          {/* Video selector */}
          <View style={styles.videoSection}>
            <Text style={styles.sectionLabel}>Select Video</Text>

            {videoUri ? (
              <View style={styles.videoPreviewContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoUri }}
                  style={styles.videoPreview}
                  useNativeControls
                  resizeMode="contain"
                  isLooping
                />

                <TouchableOpacity
                  style={styles.changeVideoButton}
                  onPress={pickVideo}
                >
                  <Text style={styles.changeVideoButtonText}>Change Video</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectVideoButton}
                onPress={pickVideo}
              >
                <Ionicons name="videocam" size={40} color={colors.secondary} />
                <Text style={styles.selectVideoText}>
                  Tap to select a video
                </Text>
                <Text style={styles.videoLimitText}>(60 seconds max)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Clip details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>Clip Details</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Give your clip a title"
                placeholderTextColor="#999"
                maxLength={50}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Caption</Text>
              <TextInput
                style={styles.input}
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a short caption"
                placeholderTextColor="#999"
                maxLength={150}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add a detailed description for your clip"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>
          </View>

          {/* Upload button */}
          <TouchableOpacity
            style={[
              styles.uploadButton,
              (!videoUri || !title.trim() || uploading) &&
                styles.disabledButton,
            ]}
            onPress={handleUpload}
            disabled={!videoUri || !title.trim() || uploading}
          >
            {uploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator color={colors.dark} size="small" />
                <View style={styles.uploadingInfo}>
                  <Text style={styles.uploadingText}>
                    {currentUploadStage} {Math.round(uploadProgress)}%
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${uploadProgress}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.uploadButtonText}>Upload Clip</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  scrollView: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    padding: 10,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: colors.white,
    flex: 1,
    textAlign: "center",
    marginRight: 34, // Balance the space taken by the close button
  },
  spotInfoContainer: {
    backgroundColor: colors.medium,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  spotInfoLabel: {
    color: colors.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
  spotName: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  videoSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 18,
    color: colors.white,
    marginBottom: 10,
  },
  selectVideoButton: {
    backgroundColor: colors.medium,
    height: 200,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: "dashed",
  },
  selectVideoText: {
    color: colors.secondary,
    fontSize: 16,
    marginTop: 10,
  },
  videoLimitText: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 5,
  },
  videoPreviewContainer: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
  videoPreview: {
    height: 200,
    borderRadius: 10,
  },
  changeVideoButton: {
    backgroundColor: colors.medium,
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  changeVideoButtonText: {
    color: colors.secondary,
    fontWeight: "bold",
  },
  detailsSection: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    color: colors.white,
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  charCount: {
    color: colors.secondary,
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: colors.medium,
    opacity: 0.7,
  },
  uploadButtonText: {
    color: colors.dark,
    fontSize: 18,
    fontWeight: "bold",
  },
  uploadingContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  uploadingInfo: {
    flex: 1,
    marginLeft: 15,
  },
  uploadingText: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  progressBarContainer: {
    height: 6,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.dark,
  },
});
