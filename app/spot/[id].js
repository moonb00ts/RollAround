import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../components/config/colors";
import { spotService } from "../services/api";
import { useAuth } from "../context/authContext";
import ShareSpot from "../components/ShareSpot";
import VideoClipsList from "../components/VideoClipsList";
import VideoSelector from "../components/VideoSelector";

export default function SpotDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouritingInProgress, setFavouritingInProgress] = useState(false);
  const { user, addFavouriteSpot, removeFavouriteSpot, isSpotFavourited } =
    useAuth();

  const handleVideoUploaded = async () => {
    fetchSpotDetails();
    setShowVideoForm(false);
  };

  useEffect(() => {
    fetchSpotDetails();
  }, [id]);

  useEffect(() => {
    if (spot && user) {
      setIsFavourite(isSpotFavourited(spot._id));
    }
  }, [spot, user, isSpotFavourited]);

  const fetchSpotDetails = async () => {
    try {
      setLoading(true);
      console.log("Fetching spot with ID:", id);

      const response = await spotService.getSpot(id);

      console.log("Spot fetched successfully:", response.data);
      setSpot(response.data);
    } catch (error) {
      console.error("Error fetching spot details:", error.message);

      try {
        console.log("Testing API connection with getAllSpots");
        const allSpotsResponse = await spotService.getAllSpots();
        console.log(
          "All spots fetch succeeded, count:",
          allSpotsResponse.data.length
        );

        const spotExists = allSpotsResponse.data.some((s) => s._id === id);
        console.log("Does spot exist in all spots?", spotExists);

        if (spotExists) {
          console.log(
            "Spot exists in all spots, but can't be fetched individually"
          );
          const spot = allSpotsResponse.data.find((s) => s._id === id);
          console.log("Using spot from all spots instead:", spot);
          setSpot(spot);
          return;
        }
      } catch (testError) {
        console.error("Even getAllSpots failed:", testError.message);
      }

      setError(`Failed to load spot details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFavourite = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to favourite spots");
      return;
    }

    if (favouritingInProgress) return;

    try {
      setFavouritingInProgress(true);

      if (isFavourite) {
        await removeFavouriteSpot(spot._id);
        setIsFavourite(false);
        Alert.alert("Success", "Spot removed from favourites");
      } else {
        await addFavouriteSpot(spot._id, spot.name, spot.spotType);
        setIsFavourite(true);
        Alert.alert("Success", "Spot added to favourites");
      }
    } catch (error) {
      console.error("Error toggling favourite:", error);
      Alert.alert("Error", "Failed to update favourites");
    } finally {
      setFavouritingInProgress(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading spot details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color={colors.secondary} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSpotDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!spot) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color={colors.secondary} />
        <Text style={styles.errorText}>Spot not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>

      <FlatList
        data={[{ key: "spot_details" }]} // Single item to render once
        renderItem={() => (
          <>
            <View style={styles.imageContainer}>
              {spot.images && spot.images.length > 0 ? (
                <View>
                  <FlatList
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    data={spot.images}
                    keyExtractor={(_, index) => `image_${index}`}
                    renderItem={({ item }) => (
                      <Image
                        source={{ uri: item.url }}
                        style={styles.spotImage}
                        resizeMode="cover"
                      />
                    )}
                    onScroll={(event) => {
                      const slideSize =
                        event.nativeEvent.layoutMeasurement.width;
                      const index = Math.round(
                        event.nativeEvent.contentOffset.x / slideSize
                      );
                      if (index !== activeImageIndex) {
                        setActiveImageIndex(index);
                      }
                    }}
                    scrollEventThrottle={16}
                  />
                  {spot.images.length > 1 && (
                    <View style={styles.imageDots}>
                      {spot.images.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.imageDot,
                            index === activeImageIndex && styles.activeDot,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noImageContainer}>
                  <Ionicons
                    name="image-outline"
                    size={60}
                    color={colors.secondary}
                  />
                  <Text style={styles.noImageText}>No images available</Text>
                </View>
              )}
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.headerRow}>
                <Text style={styles.spotName}>{spot.name}</Text>
                {spot.spotType && (
                  <View style={styles.spotTypeTag}>
                    <Text style={styles.spotTypeText}>{spot.spotType}</Text>
                  </View>
                )}
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{spot.description}</Text>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <Ionicons name="share-social" size={24} color={colors.dark} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isFavourite ? styles.favouriteActive : null,
                  ]}
                  onPress={handleFavourite}
                  disabled={favouritingInProgress}
                >
                  <Ionicons
                    name={isFavourite ? "heart" : "heart-outline"}
                    size={24}
                    color={colors.dark}
                  />
                  <Text style={styles.actionButtonText}>
                    {isFavourite ? "Favourited" : "Favourite"}
                  </Text>
                  {favouritingInProgress && (
                    <ActivityIndicator
                      size="small"
                      color={colors.dark}
                      style={{ marginLeft: 5 }}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Videos</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowVideoForm(!showVideoForm)}
                  >
                    <Ionicons
                      name={showVideoForm ? "close" : "add"}
                      size={20}
                      color={colors.dark}
                    />
                    <Text style={styles.addButtonText}>
                      {showVideoForm ? "Cancel" : "Add Clip"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showVideoForm ? (
                  <VideoSelector
                    onVideoUploaded={handleVideoUploaded}
                    spotId={spot._id}
                  />
                ) : (
                  <VideoClipsList
                    videos={spot.videos || []}
                    spotName={spot.name}
                    spotId={spot._id}
                  />
                )}
              </View>
            </View>
          </>
        )}
        contentContainerStyle={styles.scrollViewContent}
      />

      <ShareSpot
        isVisible={showShareModal}
        onClose={() => setShowShareModal(false)}
        spot={spot}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 5,
    flex: 1,
    backgroundColor: colors.dark,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.dark,
  },
  loadingText: {
    color: colors.white,
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.dark,
    padding: 20,
  },
  errorText: {
    color: colors.white,
    marginTop: 15,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.dark,
    fontWeight: "bold",
  },
  favouriteActive: {
    backgroundColor: colors.primary,
  },
  // Back button (update position)
  backButton: {
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    color: "white",
  },
  imageContainer: {
    width: "100%",
    height: 300,
    backgroundColor: colors.medium,
  },
  spotImage: {
    width: Dimensions.get("window").width,
    height: 300,
  },
  imageDots: {
    flexDirection: "row",
    position: "absolute",
    bottom: 15,
    alignSelf: "center",
    width: "100%",
    justifyContent: "center",
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.medium,
    margin: 5,
    opacity: 0.7,
  },
  activeDot: {
    backgroundColor: colors.primary,
    opacity: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    color: colors.secondary,
    marginTop: 10,
  },
  detailsContainer: {
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    flexWrap: "wrap",
  },
  spotName: {
    color: colors.white,
    fontSize: 30,
    fontFamily: "SubwayBerlinSC",
    flex: 1,
    marginRight: 10,
  },
  spotTypeTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  spotTypeText: {
    color: colors.dark,
    fontWeight: "bold",
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locationText: {
    color: colors.white,
    marginLeft: 5,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
  },
  description: {
    color: colors.white,
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 40,
  },
  actionButton: {
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.dark,
    fontWeight: "bold",
    marginLeft: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: colors.white,
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
  detailSection: {
    marginBottom: 20,
  },
});
