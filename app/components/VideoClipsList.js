import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import colors from "./config/colors";
import { useAuth } from "../context/authContext";

const { width } = Dimensions.get("window");

const VideoFeed = ({ videos = [], spotName = "", onRefresh }) => {
  const { user } = useAuth();
  const [activeVideo, setActiveVideo] = useState(null);
  const [loading, setLoading] = useState({});
  const [liked, setLiked] = useState({});

  const hasVideos = Array.isArray(videos) && videos.length > 0;

  if (!hasVideos) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-off" size={40} color={colors.secondary} />
        <Text style={styles.emptyText}>No video clips yet</Text>
      </View>
    );
  }

  const handleVideoPress = (videoId) => {
    setActiveVideo(activeVideo === videoId ? null : videoId);
  };

  const handleVideoLoad = (videoId) => {
    setLoading((prev) => ({ ...prev, [videoId]: false }));
  };

  const handleVideoLoadStart = (videoId) => {
    setLoading((prev) => ({ ...prev, [videoId]: true }));
  };

  const handleLike = (videoId) => {
    // In a real app, you would call an API to like the video
    setLiked((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
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
    const isLiked = liked[videoId];
    const videoLikes = (item.likeCount || 0) + (isLiked ? 1 : 0);
    const uploadDate = item.createdAt || new Date();

    return (
      <View style={styles.videoCard}>
        <View style={styles.videoHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>
                {(item.userName && item.userName.charAt(0).toUpperCase()) ||
                  "S"}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{item.userName || "Skater"}</Text>
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
          {isActive ? (
            <View style={styles.activeVideoContainer}>
              <Video
                source={{ uri: item.url }}
                style={styles.video}
                useNativeControls={false}
                resizeMode="cover"
                shouldPlay={true}
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
              <View style={styles.videoOverlay}>
                <TouchableOpacity style={styles.playPauseButton}>
                  <Ionicons name="pause" size={24} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: item.thumbnail || item.url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.playButtonOverlay}>
                <Ionicons name="play" size={40} color={colors.white} />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {item.caption && <Text style={styles.caption}>{item.caption}</Text>}

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(videoId)}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={isLiked ? colors.danger : colors.white}
            />
            {videoLikes > 0 && (
              <Text style={styles.actionCount}>{videoLikes}</Text>
            )}
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
      data={videos}
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
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  userName: {
    color: colors.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  videoTimestamp: {
    color: colors.secondary,
    fontSize: 12,
  },
  moreButton: {
    padding: 5,
  },
  videoContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: colors.black,
  },
  activeVideoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loader: {
    position: "absolute",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  caption: {
    color: colors.white,
    fontSize: 14,
    padding: 15,
    paddingTop: 12,
    paddingBottom: 8,
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

export default VideoFeed;
