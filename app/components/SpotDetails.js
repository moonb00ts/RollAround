import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../components/config/colors";
import { useAuth } from "../context/authContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Video } from "expo-av";
import ShareSpot from "../components/ShareSpot";
import { firestore } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import AppButton from "../components/AppButton";

// Get screen dimensions for responsive layout
const { width } = Dimensions.get("window");
const CLIP_WIDTH = width - 40; // Accounting for padding
const CLIP_HEIGHT = CLIP_WIDTH * 0.56; // 16:9 aspect ratio

export default function SpotDetails({ spotId: propSpotId }) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const params = useLocalSearchParams();

  // Use either the prop spotId (passed directly) or get it from the URL params
  const spotId = propSpotId || params.id;

  const [loading, setLoading] = useState(true);
  const [spot, setSpot] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeClip, setActiveClip] = useState(null);
  const [clipModalVisible, setClipModalVisible] = useState(false);

  // Fetch spot data and clips
  useEffect(() => {
    const fetchSpotData = async () => {
      if (!spotId) {
        setError("No spot ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching spot with ID:", spotId);

        // Fetch spot data
        const spotRef = doc(firestore, "spots", spotId);
        const spotSnap = await getDoc(spotRef);

        if (!spotSnap.exists()) {
          setError("Spot not found");
          setLoading(false);
          return;
        }

        const spotData = { id: spotSnap.id, ...spotSnap.data() };
        console.log("Spot data fetched:", spotData.name);
        setSpot(spotData);

        // Check if this spot is a favorite (safely)
        if (userProfile?.favoriteSpots) {
          // Use optional chaining and safely check if the array includes the spotId
          const isSpotFavorite = userProfile.favoriteSpots.includes(spotId);
          setIsFavorite(isSpotFavorite);
        }

        // Fetch clips for this spot
        try {
          const clipsRef = collection(firestore, "clips");
          const clipsQuery = query(clipsRef, where("spotId", "==", spotId));
          const clipsSnap = await getDocs(clipsQuery);

          const clipsData = [];
          clipsSnap.forEach((doc) => {
            const clipData = doc.data();
            // Safely check if current user has liked this clip
            const isLiked = clipData.likedBy
              ? clipData.likedBy.includes(user?.uid)
              : false;

            clipsData.push({
              id: doc.id,
              ...clipData,
              isLiked: isLiked,
            });
          });

          // Sort clips by date (newest first) - with safe handling of dates
          clipsData.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });

          setClips(clipsData);
        } catch (clipsError) {
          console.error("Error fetching clips:", clipsError);
          // Don't fail the whole component if clips can't be fetched
          setClips([]);
        }
      } catch (error) {
        console.error("Error fetching spot data:", error);
        setError(`Failed to load spot data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSpotData();
  }, [spotId, user?.uid, userProfile]);

  // Handle share button
  const handleShare = () => {
    setShareModalVisible(true);
  };

  // Share spot via native share
  const shareSpotNatively = async () => {
    if (!spot) return;

    try {
      await Share.share({
        message: `Check out this skate spot: ${spot.name || "Awesome spot"} - ${
          spot.description || ""
        }`,
      });
    } catch (error) {
      console.error("Error sharing spot:", error);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async () => {
    if (!user || !spot) return;

    try {
      const userRef = doc(firestore, "users", user.uid);

      if (isFavorite) {
        // Remove from favorites
        await updateDoc(userRef, {
          favoriteSpots: arrayRemove(spotId),
        });
      } else {
        // Add to favorites
        await updateDoc(userRef, {
          favoriteSpots: arrayUnion(spotId),
        });
      }

      // Update local state
      setIsFavorite(!isFavorite);

      // Show confirmation
      Alert.alert(
        isFavorite ? "Removed from favorites" : "Added to favorites",
        isFavorite
          ? "This spot has been removed from your favorites."
          : "This spot has been added to your favorites."
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "Failed to update favorites. Please try again.");
    }
  };

  // Like/unlike a clip
  const toggleLike = async (clipId) => {
    if (!user) return;

    try {
      const clipRef = doc(firestore, "clips", clipId);
      const clipSnap = await getDoc(clipRef);

      if (!clipSnap.exists()) {
        Alert.alert("Error", "Clip not found");
        return;
      }

      const clipData = clipSnap.data();
      const likedBy = clipData.likedBy || [];
      const isLiked = likedBy.includes(user.uid);

      if (isLiked) {
        // Unlike the clip
        await updateDoc(clipRef, {
          likedBy: arrayRemove(user.uid),
          likeCount: Math.max((clipData.likeCount || 1) - 1, 0), // Ensure we don't go below 0
        });
      } else {
        // Like the clip
        await updateDoc(clipRef, {
          likedBy: arrayUnion(user.uid),
          likeCount: (clipData.likeCount || 0) + 1,
        });
      }

      // Update local state
      setClips(
        clips.map((clip) =>
          clip.id === clipId
            ? {
                ...clip,
                isLiked: !isLiked,
                likeCount: isLiked
                  ? Math.max((clip.likeCount || 1) - 1, 0)
                  : (clip.likeCount || 0) + 1,
              }
            : clip
        )
      );
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to update like. Please try again.");
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // View clip in fullscreen
  const viewClip = (clip) => {
    setActiveClip(clip);
    setClipModalVisible(true);
  };

  // Add a new clip (navigation)
  const addNewClip = () => {
    router.push({
      pathname: "/addClip",
      params: { spotId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={40} color={colors.secondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{spot?.name || "Spot Details"}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={toggleFavorite}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? colors.primary : colors.white}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons
                name="share-social-outline"
                size={24}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Spot Images */}
        {spot?.images && spot.images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.imageScroll}
          >
            {spot.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image.url }}
                style={styles.spotImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image" size={40} color={colors.secondary} />
            <Text style={styles.noImageText}>No images available</Text>
          </View>
        )}

        
        <View style={styles.infoContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={styles.detailText}>
              {spot?.location?.address || "Location not specified"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="pricetag" size={20} color={colors.primary} />
            <Text style={styles.detailText}>
              {spot?.spotType || "Type not specified"}
            </Text>
          </View>
          <Text style={styles.description}>
            {spot?.description || "No description available"}
          </Text>
        </View>

        {/* Clips Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clips</Text>
          <TouchableOpacity style={styles.addButton} onPress={addNewClip}>
            <Ionicons name="add" size={18} color={colors.dark} />
            <Text style={styles.addButtonText}>Add Clip</Text>
          </TouchableOpacity>
        </View>

        {/* Clips List */}
        {clips && clips.length > 0 ? (
          <View style={styles.clipsContainer}>
            {clips.map((clip) => (
              <View key={clip.id} style={styles.clipCard}>
                <TouchableOpacity
                  onPress={() => viewClip(clip)}
                  style={styles.videoContainer}
                >
                  {clip.thumbnailUrl ? (
                    <Image
                      source={{ uri: clip.thumbnailUrl }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noThumbnail}>
                      <Ionicons
                        name="videocam"
                        size={30}
                        color={colors.secondary}
                      />
                    </View>
                  )}
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={24} color={colors.white} />
                  </View>
                </TouchableOpacity>

                <View style={styles.clipInfo}>
                  <Text style={styles.clipTitle}>
                    {clip.title || "Untitled Clip"}
                  </Text>
                  <Text style={styles.clipUser}>
                    By {clip.userName || "Anonymous"}
                  </Text>
                  <Text style={styles.clipDate}>
                    {formatDate(clip.createdAt)}
                  </Text>

                  <View style={styles.clipActions}>
                    <TouchableOpacity
                      style={styles.likeButton}
                      onPress={() => toggleLike(clip.id)}
                    >
                      <Ionicons
                        name={clip.isLiked ? "heart" : "heart-outline"}
                        size={20}
                        color={clip.isLiked ? colors.primary : colors.white}
                      />
                      <Text style={styles.likeCount}>
                        {clip.likeCount || 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commentButton}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={20}
                        color={colors.white}
                      />
                      <Text style={styles.commentCount}>
                        {clip.commentCount || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noClipsContainer}>
            <Ionicons name="videocam-off" size={40} color={colors.secondary} />
            <Text style={styles.noClipsText}>No clips yet</Text>
            <Text style={styles.noClipsSubtext}>
              Be the first to add a clip to this spot!
            </Text>
            <AppButton title="Add a Clip" onPress={addNewClip} />
          </View>
        )}
      </ScrollView>

      {/* Share Modal */}
      {spot && (
        <ShareSpot
          isVisible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          spot={spot}
        />
      )}

      {/* Clip Viewing Modal */}
      <Modal
        visible={clipModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setClipModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setClipModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>

            {activeClip && (
              <View style={styles.videoWrapper}>
                <Video
                  source={{ uri: activeClip.videoUrl }}
                  style={styles.fullVideo}
                  resizeMode="contain"
                  useNativeControls
                  shouldPlay
                  isLooping
                />

                <View style={styles.clipModalInfo}>
                  <Text style={styles.clipModalTitle}>
                    {activeClip.title || "Untitled Clip"}
                  </Text>
                  <Text style={styles.clipModalUser}>
                    By {activeClip.userName || "Anonymous"}
                  </Text>

                  <View style={styles.clipModalActions}>
                    <TouchableOpacity
                      style={styles.modalActionButton}
                      onPress={() => toggleLike(activeClip.id)}
                    >
                      <Ionicons
                        name={activeClip.isLiked ? "heart" : "heart-outline"}
                        size={24}
                        color={
                          activeClip.isLiked ? colors.primary : colors.white
                        }
                      />
                      <Text style={styles.modalActionText}>
                        {activeClip.likeCount || 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.modalActionButton}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={24}
                        color={colors.white}
                      />
                      <Text style={styles.modalActionText}>
                        {activeClip.commentCount || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontFamily: "SubwayBerlinSC",
    textAlign: "center",
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
  },
  imageScroll: {
    height: 220,
  },
  spotImage: {
    width: width,
    height: 220,
  },
  noImageContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.medium,
  },
  noImageText: {
    color: colors.secondary,
    marginTop: 10,
  },
  infoContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailText: {
    color: colors.white,
    marginLeft: 10,
    fontSize: 16,
  },
  description: {
    color: colors.white,
    fontSize: 16,
    marginTop: 10,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 20,
    fontFamily: "SubwayBerlinSC",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addButtonText: {
    color: colors.dark,
    marginLeft: 5,
    fontWeight: "bold",
  },
  clipsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  clipCard: {
    backgroundColor: colors.medium,
    borderRadius: 10,
    marginBottom: 20,
    overflow: "hidden",
  },
  videoContainer: {
    height: CLIP_HEIGHT,
    width: CLIP_WIDTH,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  noThumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.medium,
  },
  playButton: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  clipInfo: {
    padding: 15,
  },
  clipTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  clipUser: {
    color: colors.secondary,
    fontSize: 14,
  },
  clipDate: {
    color: colors.secondary,
    fontSize: 12,
    marginTop: 5,
  },
  clipActions: {
    flexDirection: "row",
    marginTop: 10,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  likeCount: {
    color: colors.white,
    marginLeft: 5,
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentCount: {
    color: colors.white,
    marginLeft: 5,
  },
  noClipsContainer: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 40,
  },
  noClipsText: {
    color: colors.white,
    fontSize: 18,
    marginTop: 10,
  },
  noClipsSubtext: {
    color: colors.secondary,
    textAlign: "center",
    marginVertical: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: colors.secondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 15,
    marginBottom: 20,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  videoWrapper: {
    width: "100%",
    height: "80%",
    justifyContent: "center",
  },
  fullVideo: {
    width: "100%",
    height: "70%",
  },
  clipModalInfo: {
    padding: 20,
    alignItems: "center",
  },
  clipModalTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  clipModalUser: {
    color: colors.secondary,
    fontSize: 16,
    marginBottom: 20,
  },
  clipModalActions: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  modalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
  },
  modalActionText: {
    color: colors.white,
    marginLeft: 5,
    fontSize: 16,
  },
});
