import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import colors from "./config/colors";
import { useAuth } from "../context/authContext";
import { spotService } from "../services/api";
import UserAvatar from "./UserAvatar";

const { width } = Dimensions.get("window");

const VideoClipsList = ({
  videos = [],
  spotName = "",
  spotId = "",
  onRefresh,
}) => {
  const { user } = useAuth();
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState({});
  const [sortedVideos, setSortedVideos] = useState([]);
  const videoRefs = useRef({});

  // Sort videos by date (newest first) whenever the videos prop changes
  useEffect(() => {
    if (Array.isArray(videos) && videos.length > 0) {
      // Create a copy of the videos array to avoid mutating props
      const videosCopy = [...videos];

      // Sort by createdAt date in descending order (newest first)
      const sorted = videosCopy.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });

      setSortedVideos(sorted);
      console.log(`Sorted ${sorted.length} videos by date, newest first`);
    } else {
      setSortedVideos([]);
    }
  }, [videos]);

  const hasVideos = Array.isArray(sortedVideos) && sortedVideos.length > 0;

  if (!hasVideos) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-off" size={40} color={colors.secondary} />
        <Text style={styles.emptyText}>No video clips yet</Text>
      </View>
    );
  }

  const handleVideoPress = async (videoId) => {
    // Toggle video playback when tapped
    if (activeVideo === videoId) {
      // Video is currently active, pause it
      const videoRef = videoRefs.current[videoId];
      if (videoRef) {
        const status = await videoRef.getStatusAsync();
        if (status.isPlaying) {
          await videoRef.pauseAsync();
        } else {
          await videoRef.playAsync();
        }
      }
    } else {
      // Different video selected, pause previous and play new one
      if (activeVideo && videoRefs.current[activeVideo]) {
        await videoRefs.current[activeVideo].pauseAsync();
      }

      setActiveVideo(videoId);
      // Play will be handled in useEffect when video loads
      const videoRef = videoRefs.current[videoId];
      if (videoRef) {
        await videoRef.playAsync();
      }
    }
  };

  const handleVideoLoad = (videoId) => {
    setLoading((prev) => ({ ...prev, [videoId]: false }));
  };

  const handleVideoLoadStart = (videoId) => {
    setLoading((prev) => ({ ...prev, [videoId]: true }));
  };

  const handleLike = async (videoId, index) => {
    try {
      // Optimistically update the UI immediately for responsiveness
      const updatedVideos = [...sortedVideos];
      updatedVideos[index] = {
        ...updatedVideos[index],
        likeCount: (updatedVideos[index].likeCount || 0) + 1,
      };
      setSortedVideos(updatedVideos);

      console.log(`Liking video ${videoId} in spot ${spotId}`);

      // Skip API call if no spotId
      if (!spotId) {
        console.warn("No spotId provided, skipping API call");
        return;
      }

      // Call API to update the like count in the database
      try {
        await spotService.incrementVideoLikes(spotId, videoId);
        console.log(`Successfully incremented likes for video ${videoId}`);
      } catch (error) {
        console.error("Error incrementing likes:", error);
        // We don't revert the UI since we want unlimited likes regardless
      }
    } catch (error) {
      console.error("Error in handleLike:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Recently";

    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderVideoItem = ({ item, index }) => {
    const videoId = item._id || `video-${index}`;
    const isActive = activeVideo === videoId;
    const videoLikes = item.likeCount || 0;
    const uploadDate = item.createdAt || new Date();

    // More robust username determination
    let uploader = "Skater";

    if (
      item.userName &&
      typeof item.userName === "string" &&
      item.userName.trim()
    ) {
      uploader = item.userName;
    } else if (
      item.uploadedBy &&
      typeof item.uploadedBy === "string" &&
      item.uploadedBy.trim()
    ) {
      uploader = `User ${item.uploadedBy.substring(0, 5)}...`;
    } else {
      // Fallback to a unique name based on index
      uploader = `Skater ${index + 1}`;
    }

    return (
      <View style={styles.videoCard}>
        <View style={styles.videoHeader}>
          <View style={styles.userInfo}>
            <UserAvatar
              userId={item.uploadedBy}
              displayName={uploader}
              profilePhoto={item.profilePhoto}
              size={36}
            />
            <View>
              <Text style={styles.userName}>{uploader}</Text>
              <Text style={styles.videoTimestamp}>
                {formatTimestamp(uploadDate)}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.videoContainer}
          activeOpacity={0.9}
          onPress={() => handleVideoPress(videoId)}
        >
          <Video
            ref={(ref) => (videoRefs.current[videoId] = ref)}
            source={{ uri: item.url }}
            style={styles.video}
            useNativeControls={false}
            resizeMode="cover"
            shouldPlay={isActive}
            isLooping={true}
            onLoad={() => handleVideoLoad(videoId)}
            onLoadStart={() => handleVideoLoadStart(videoId)}
          />
          {loading[videoId] && (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          )}
          {!isActive && (
            <View style={styles.playButtonOverlay}>
              <Ionicons name="play" size={40} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        {/* Add empty space if no caption */}
        {item.caption ? (
          <Text style={styles.caption}>{item.caption}</Text>
        ) : (
          <View style={styles.captionPlaceholder} />
        )}

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(videoId, index)}
          >
            <Ionicons name="heart" size={24} color={colors.danger} />
            <Text style={styles.actionCount}>{videoLikes}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={colors.white}
            />
            {item.commentCount > 0 && (
              <Text style={styles.actionCount}>{item.commentCount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name="share-social-outline"
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.spotInfo}>
          <Ionicons
            name="location-outline"
            size={14}
            color={colors.secondary}
          />
          <Text style={styles.spotName}>{spotName}</Text>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={sortedVideos}
      renderItem={renderVideoItem}
      keyExtractor={(item, index) => item._id || `video-${index}`}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onRefresh={onRefresh}
      refreshing={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  videoCard: {
    backgroundColor: colors.medium,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 15,
  },
  videoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 10,
  },
  videoTimestamp: {
    color: colors.secondary,
    fontSize: 12,
    marginLeft: 10,
  },
  moreButton: {
    padding: 5,
  },
  videoContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: colors.black,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    right: 30,
  },
  caption: {
    color: colors.white,
    fontSize: 14,
    padding: 15,
    paddingTop: 12,
    paddingBottom: 8,
  },
  captionPlaceholder: {
    height: 15, // Space when no caption is present
  },
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  actionCount: {
    color: colors.white,
    fontSize: 14,
    marginLeft: 5,
  },
  spotInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  spotName: {
    color: colors.secondary,
    fontSize: 12,
    marginLeft: 4,
  },
  separator: {
    height: 10,
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.secondary,
    marginTop: 10,
    textAlign: "center",
  },
});

export default VideoClipsList;
