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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppText from "../components/AppText";
import MapView, { Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import colors from "../components/config/colors";
import { spotService } from "../services/api";

export default function AddSpot() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({
    latitude: 51.4414,
    longitude: -2.6036,
  });
  const [images, setImages] = useState([]);
  const [spotType, setSpotType] = useState("");

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location services to add a spot"
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(userLocation);

      // Animate map to user location
      mapRef.current?.animateToRegion(
        {
          ...userLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    } catch (error) {
      console.log("Error getting location:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your location. Please try again."
      );
    }
  };

  const handleClose = () => {
    // Enhanced close button handler
    console.log("Close button pressed");

    // Check if there's unsaved work
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

    setIsSubmitting(true);

    try {
      const spotData = {
        name: spotName,
        description: description,
        location: {
          type: "Point",
          coordinates: [location.longitude, location.latitude],
          address:
            location.address || "123 Some Street, Some City, Some Country",
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
                    console.log(type);
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
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  ...location,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(e) => setLocation(e.nativeEvent.coordinate)}
              >
                <Marker coordinate={location} />
              </MapView>
            </View>
            <Text style={styles.mapHelper}>Tap to set spot location</Text>
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
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  map: {
    flex: 1,
  },
  mapHelper: {
    color: colors.secondary,
    fontSize: 12,
    textAlign: "center",
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
