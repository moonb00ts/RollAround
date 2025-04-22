import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "./config/colors";
import { reportService } from "../services/api";
import { useAuth } from "../context/authContext";

/**
 * Universal report modal that works with any content type
 *
 * @param {Object} props
 * @param {boolean} props.visible - Controls modal visibility
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {string} props.contentType - Type of content being reported (spot, event, video, user, etc)
 * @param {string} props.contentId - ID of the content being reported
 * @param {string} props.contentName - Name of the content (optional)
 * @param {object} props.additionalData - Any additional data needed for the report
 */
const UniversalReportModal = ({
  visible,
  onClose,
  contentType = "content",
  contentId,
  contentName = "",
  additionalData = {},
}) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollViewRef = useRef(null);

  const reportReasons = {
    inappropriate: {
      label: "Inappropriate Content",
      icon: "alert-circle",
    },
    spam: {
      label: "Spam",
      icon: "paper-plane",
    },
    harassment: {
      label: "Harassment",
      icon: "chatbubble-ellipses",
    },
    copyright: {
      label: "Copyright Violation",
      icon: "document-text",
    },
    safety: {
      label: "Safety Concern",
      icon: "shield-outline",
    },
    location: {
      label: "Incorrect Location",
      icon: "location-outline",
      showFor: ["spot"], // Only show for certain content types
    },
    other: {
      label: "Other",
      icon: "ellipsis-horizontal-circle",
    },
  };

  // Filter reasons based on content type
  const availableReasons = Object.entries(reportReasons)
    .filter(
      ([key, data]) => !data.showFor || data.showFor.includes(contentType)
    )
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  const resetForm = () => {
    setSelectedReason("");
    setAdditionalInfo("");
  };

  const handleClose = () => {
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  const handleTextInputFocus = () => {
    // Scroll to the text input when it's focused
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for reporting");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to report content");
      return;
    }

    setSubmitting(true);
    Keyboard.dismiss();

    try {
      // Build the report object
      const report = {
        contentType,
        contentId,
        reportedBy: user.uid,
        reason: selectedReason,
        additionalInfo,
        reportedAt: new Date(),
        status: "pending",
        ...additionalData, // Include any additional data passed in
      };

      // Submit the report using the report service
      await reportService.submitReport(report);

      // Success message
      Alert.alert(
        "Report Submitted",
        "Thank you for your report. We will review it shortly.",
        [{ text: "OK" }]
      );

      // Reset and close
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const contentTypeDisplay =
    {
      video: "video",
      spot: "skate spot",
      event: "event",
      user: "user",
      comment: "comment",
    }[contentType] || contentType;

  const titleText = contentName
    ? `Report ${contentTypeDisplay}: ${contentName}`
    : `Report ${contentTypeDisplay}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{titleText}</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.subtitle}>
                Why are you reporting this {contentTypeDisplay}?
              </Text>

              <View style={styles.reasonsContainer}>
                {Object.entries(availableReasons).map(
                  ([key, { label, icon }]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.reasonItem,
                        selectedReason === key && styles.selectedReason,
                      ]}
                      onPress={() => setSelectedReason(key)}
                    >
                      <Ionicons
                        name={icon}
                        size={20}
                        color={
                          selectedReason === key ? colors.dark : colors.white
                        }
                      />
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === key && styles.selectedReasonText,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.subtitle}>Additional details (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Provide any additional information..."
                placeholderTextColor={colors.secondary}
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                multiline
                numberOfLines={4}
                maxLength={500}
                onFocus={handleTextInputFocus}
              />
              <Text style={styles.charCounter}>
                {additionalInfo.length}/500
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!selectedReason || submitting) && styles.disabledButton,
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedReason || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.dark} />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.dark,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
    paddingBottom: 15,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontFamily: "SubwayBerlinSC",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  subtitle: {
    color: colors.white,
    fontSize: 16,
    marginBottom: 10,
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.medium,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedReason: {
    backgroundColor: colors.primary,
  },
  reasonText: {
    color: colors.white,
    marginLeft: 10,
    fontSize: 16,
  },
  selectedReasonText: {
    color: colors.dark,
    fontWeight: "bold",
  },
  textInput: {
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 12,
    color: colors.white,
    height: 100,
    textAlignVertical: "top",
  },
  charCounter: {
    color: colors.secondary,
    fontSize: 12,
    textAlign: "right",
    marginTop: 5,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: colors.medium,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flex: 0.48,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flex: 0.48,
  },
  submitButtonText: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default UniversalReportModal;
