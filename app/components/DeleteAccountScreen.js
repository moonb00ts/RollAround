import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import colors from "./config/colors";
import { useAuth } from "../context/authContext";

const DeleteAccountScreen = () => {
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const validateForm = () => {
    if (!password) {
      Alert.alert("Error", "Please enter your password to confirm deletion");
      return false;
    }

    if (confirmText !== "DELETE") {
      Alert.alert("Error", "Please type DELETE to confirm account deletion");
      return false;
    }

    return true;
  };

  const handleDeleteAccount = async () => {
    if (!validateForm()) return;

    // Show final confirmation
    Alert.alert(
      "Delete Account Permanently?",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: performDeletion,
        },
      ]
    );
  };

  const performDeletion = async () => {
    try {
      setIsDeleting(true);

      await deleteAccount(password);

      // If we get here, deletion was successful
      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted. You will now be logged out.",
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    } catch (error) {
      console.error("Error deleting account:", error);

      let errorMessage = "Failed to delete your account. Please try again.";

      // Handle specific error cases
      if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "For security, please log out and log back in before deleting your account.";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={32} color={colors.danger} />
            <Text style={styles.warningTitle}>Warning: Permanent Action</Text>
            <Text style={styles.warningText}>
              Deleting your account is irreversible. When you delete your
              account:
            </Text>
            <View style={styles.bulletPoints}>
              <Text style={styles.bulletPoint}>
                • All your personal data will be permanently deleted
              </Text>
              <Text style={styles.bulletPoint}>
                • Your profile and account settings will be removed
              </Text>
              <Text style={styles.bulletPoint}>
                • You will lose access to all saved spots and friends
              </Text>
              <Text style={styles.bulletPoint}>
                • Your content will be unlinked from your identity
              </Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Confirm your password</Text>
            <Text style={styles.sectionDescription}>
              For security, please enter your current password to confirm
              deletion
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={colors.secondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color={colors.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmPrompt}>Type "DELETE" to confirm</Text>
            <TextInput
              style={styles.confirmInput}
              placeholder="Type DELETE here"
              placeholderTextColor={colors.secondary}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              (!password || confirmText !== "DELETE" || isDeleting) &&
                styles.disabledButton,
            ]}
            onPress={handleDeleteAccount}
            disabled={!password || confirmText !== "DELETE" || isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="trash" size={20} color={colors.white} />
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.cancelText}>
            Changed your mind?{" "}
            <Text style={styles.cancelLink} onPress={handleBack}>
              Go back to profile
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 22,
    color: colors.white,
    fontFamily: "SubwayBerlinSC",
  },
  headerRight: {
    width: 44, // Balance the back button
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  warningBox: {
    backgroundColor: "rgba(255, 82, 82, 0.1)",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  warningTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  warningText: {
    color: colors.white,
    textAlign: "center",
    marginBottom: 10,
  },
  bulletPoints: {
    alignSelf: "stretch",
    marginTop: 10,
  },
  bulletPoint: {
    color: colors.white,
    marginBottom: 8,
  },
  formSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  sectionDescription: {
    color: colors.secondary,
    marginBottom: 15,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 20,
  },
  passwordInput: {
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 15,
    color: colors.white,
    fontSize: 16,
    width: "100%",
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    top: 15,
  },
  confirmPrompt: {
    color: colors.white,
    marginBottom: 10,
  },
  confirmInput: {
    backgroundColor: colors.medium,
    borderRadius: 8,
    padding: 15,
    color: colors.white,
    fontSize: 16,
    width: "100%",
  },
  deleteButton: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  cancelText: {
    color: colors.secondary,
    textAlign: "center",
  },
  cancelLink: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
});

export default DeleteAccountScreen;
