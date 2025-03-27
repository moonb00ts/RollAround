import React, { useState, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppText from "../components/AppText";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import colors from "../components/config/colors";
import { spotService } from "../services/api";
import MapComponent from "../components/MapComponent";

export default function AddSpot() {
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({
    latitude: 51.4414,
    longitude: -2.6036,
  });
  const [address, setAddress] = useState("");
  const [images, setImages] = useState([]);
  const [spotType, setSpotType] = useState("");

  // Define the location change handler
  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
  };

  // Define the address change handler
  const handleAddressChange = (newAddress) => {
    setAddress(newAddress);
  };

  const handleClose = () => {
    // Enhanced close button handler
    const hasUnsavedWork = spotName || description || images.length > 0;

    if (hasUnsavedWork) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to go back?",
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
      // No unsaved work, just go back
      router.back();
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need camera roll permissions to upload photos!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7, // Reduced for faster uploads
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;

        // Add to images array immediately for preview
        setImages((prev) => [
          ...prev,
          {
            localUri: imageUri,
            cloudinaryUrl: null,
          },
        ]);

        // Prepare the form data
        const formData = new FormData();
        const fileType = imageUri.split(".").pop();
        formData.append("file", {
          uri: imageUri,
          type: `image/${fileType}`,
          name: `upload.${fileType}`,
        });

        try {
          // Upload with progress tracking
          const uploadResponse = await spotService.uploadImage(
            formData,
            (progress) => {
              setUploadProgress((prev) => ({
                ...prev,
                [imageUri]: progress,
              }));
            }
          );

          // Update the image with its Cloudinary URL
          setImages((prev) =>
            prev.map((img) =>
              img.localUri === imageUri
                ? { ...img, cloudinaryUrl: uploadResponse.url }
                : img
            )
          );

          // Clear progress
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[imageUri];
            return newProgress;
          });
        } catch (error) {
          console.error("Upload failed:", error);
          Alert.alert("Upload Failed", "Would you like to try again?", [
            { text: "Try Again", onPress: () => pickImage() },
            { text: "Cancel" },
          ]);
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "There was a problem selecting the image.");
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      Alert.alert("Please wait", "Your spot is currently being submitted...");
      return;
    }

    // Check if any uploads are still in progress
    if (Object.keys(uploadProgress).length > 0) {
      Alert.alert("Please wait", "Images are still uploading...");
      return;
    }

    // Validate form fields
    if (!spotName.trim()) {
      Alert.alert("Missing Information", "Please enter a spot name.");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Missing Information", "Please provide a description.");
      return;
    }

    if (!spotType) {
      Alert.alert("Missing Information", "Please select a spot type.");
      return;
    }

    if (!location.latitude || !location.longitude) {
      Alert.alert("Missing Information", "Please set a location on the map.");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Missing Information", "Please add at least one image.");
      return;
    }

    setIsSubmitting(true);

    try {
      const spotData = {
        name: spotName,
        description: description,
        location: {
          type: "Point",
          coordinates: [location.longitude, location.latitude],
          address: address || "Location address unavailable",
        },
        spotType: spotType,
        images: images
          .filter((img) => img.cloudinaryUrl) // Only include successfully uploaded images
          .map((img) => ({
            url: img.cloudinaryUrl,
            caption: "",
          })),
      };

      const response = await spotService.createSpot(spotData);
      Alert.alert("Success", "Spot added successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to submit spot. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <AppText style={styles.title}>Add a new spot</AppText>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Spot Name</Text>
            <TextInput
              style={styles.input}
              value={spotName}
              onChangeText={setSpotName}
              placeholder="Enter spot name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Spot Type</Text>
            <View style={styles.typeButtonsContainer}>
              {["Street", "Park", "DIY", "Transition"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    spotType === type && styles.selectedTypeButton,
                  ]}
                  onPress={() => {
                    setSpotType(type);
                  }}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      spotType === type && styles.selectedTypeButtonText,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the spot (obstacles, ground quality, etc.)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location</Text>
            <MapComponent
              initialLocation={location}
              onLocationChange={handleLocationChange}
              onAddressChange={handleAddressChange}
              address={address}
              placeholder="Search for skate spot location"
              fullscreen={true}
              mapStyle={styles.enhancedMap}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Photos</Text>
            <ScrollView horizontal style={styles.imageScroll}>
              {images.map((image, index) => {
                return (
                  <Image
                    key={index}
                    source={{ uri: image.localUri }}
                    style={styles.previewImage}
                  />
                );
              })}
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={pickImage}
              >
                <Ionicons name="camera" size={40} color={colors.secondary} />
              </TouchableOpacity>
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Add Spot</Text>
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: colors.white,
    flex: 1,
    textAlign: "center",
    marginRight: 34, // Balance the space taken by the close button
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: colors.white,
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
  enhancedMap: {
    marginTop: 10,
  },
  imageScroll: {
    flexGrow: 0,
    height: 120,
  },
  previewImage: {
    width: 160,
    height: 90,
    borderRadius: 8,
    marginRight: 10,
  },
  addPhotoButton: {
    width: 160,
    height: 90,
    backgroundColor: colors.medium,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: "dashed",
  },
  closeButton: {
    padding: 10,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  typeButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.medium,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  selectedTypeButton: {
    backgroundColor: colors.secondary,
  },
  typeButtonText: {
    color: colors.white,
    fontSize: 14,
  },
  selectedTypeButtonText: {
    color: colors.dark,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  submitButtonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "bold",
  },
});
