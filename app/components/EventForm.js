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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import moment from "moment";
import colors from "./config/colors";
import { eventService } from "../services/api";
import { useAuth } from "../context/authContext";
import MapComponent from "./MapComponent";

export default function EventForm() {
  const router = useRouter();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState({
    latitude: 51.4414,
    longitude: -2.6036,
  });
  const [address, setAddress] = useState("");
  const [image, setImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Define the location change handler
  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
  };

  // Define the address change handler
  const handleAddressChange = (newAddress) => {
    setAddress(newAddress);
  };

  const handleClose = () => {
    // Check if there's unsaved work
    const hasUnsavedWork = title || description || image || address;

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
        setImage({
          uri: imageUri,
          cloudinaryUrl: null,
        });

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
          const uploadResponse = await eventService.uploadImage(
            formData,
            (progress) => {
              setUploadProgress(progress);
            }
          );

          // Update the image with its Cloudinary URL
          setImage((prev) => ({
            ...prev,
            cloudinaryUrl: uploadResponse.url,
          }));

          setUploadProgress(0);
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

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === "ios");
    setDate(currentDate);
  };

  const onTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === "ios");
    setTime(currentTime);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      Alert.alert("Please wait", "Your event is currently being submitted...");
      return;
    }

    // Validate form
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for the event");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description for the event");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Error", "Please enter a location for the event");
      return;
    }

    if (!image?.cloudinaryUrl) {
      Alert.alert("Error", "Please upload an image for the event");
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const eventDateTime = new Date(date);
      eventDateTime.setHours(time.getHours(), time.getMinutes());

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: eventDateTime.toISOString(),
        image: image.cloudinaryUrl,
        location: {
          type: "Point",
          coordinates: [location.longitude, location.latitude],
          address: address.trim(),
        },
        userId: user.uid, // Current user as organizer
      };

      console.log("Submitting event data:", JSON.stringify(eventData, null, 2));

      const response = await eventService.createEvent(eventData);

      Alert.alert("Success", "Event added successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      // Enhance error logging
      console.error("Submission error:", error);
      console.error("Error response:", error.response?.data);

      Alert.alert("Error", `Failed to submit event: ${error.message}`);
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
            <Text style={styles.title}>Add a new event</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event title"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the event"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Date & Time</Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateTimeText}>
                  {moment(date).format("MMM D, YYYY")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={styles.dateTimeText}>
                  {moment(time).format("h:mm A")}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange}
              />
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Event Image</Text>
            <View>
              {image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  {uploadProgress > 0 && uploadProgress < 1 && (
                    <View style={styles.uploadProgressContainer}>
                      <View
                        style={[
                          styles.uploadProgressBar,
                          { width: `${uploadProgress * 100}%` },
                        ]}
                      />
                      <Text style={styles.uploadProgressText}>
                        {Math.round(uploadProgress * 100)}%
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={pickImage}
                  >
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadImageButton}
                  onPress={pickImage}
                >
                  <Ionicons name="image" size={40} color={colors.secondary} />
                  <Text style={styles.uploadImageText}>Upload Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location</Text>
            <MapComponent
              initialLocation={location}
              onLocationChange={handleLocationChange}
              onAddressChange={handleAddressChange}
              address={address}
              placeholder="Search for event location"
              fullscreen={true}
              mapStyle={styles.enhancedMap}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.dark} />
            ) : (
              <Text style={styles.submitButtonText}>Add Event</Text>
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
    flex: 1,
    textAlign: "center",
    marginRight: 34, // Balance the space taken by the close button
    fontFamily: "SubwayBerlinSC",
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
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 12,
    flex: 0.48,
  },
  dateTimeText: {
    color: colors.white,
    marginLeft: 8,
  },
  uploadImageButton: {
    height: 120,
    backgroundColor: colors.medium,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: "dashed",
  },
  uploadImageText: {
    color: colors.secondary,
    marginTop: 8,
  },
  imagePreviewContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 5,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  uploadProgressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    alignItems: "center",
  },
  uploadProgressBar: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  uploadProgressText: {
    position: "absolute",
    right: 0,
    left: 0,
    color: colors.white,
    fontSize: 12,
    textAlign: "center",
  },
  changeImageButton: {
    backgroundColor: colors.medium,
    padding: 8,
    alignItems: "center",
  },
  changeImageText: {
    color: colors.secondary,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
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
  closeButton: {
    padding: 10,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: colors.secondary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "bold",
  },
});
