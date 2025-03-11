import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import colors from "./config/colors";

const { width } = Dimensions.get("window");

const VideoClipsList = ({ videos = [], spotName = "" }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Check if videos is actually defined and has elements
  const hasVideos = Array.isArray(videos) && videos.length > 0;

  if (!hasVideos) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-off" size={40} color={colors.secondary} />
        <Text style={styles.emptyText}>No video clips yet</Text>
      </View>
    );
  }

  const openVideo = (video) => {
    setSelectedVideo(video);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVideo(null);
  };

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity style={styles.videoItem} onPress={() => openVideo(item)}>
      <View style={styles.thumbnailContainer}>
        <Image
          source={{
            uri:
              item.thumbnail || item.url || "https://via.placeholder.com/150",
          }}
          style={styles.thumbnail}
        />
        <View style={styles.playButton}>
          <Ionicons name="play" size={24} color={colors.white} />
        </View>
      </View>
      {item.caption && (
        <Text style={styles.caption} numberOfLines={1}>
          {item.caption}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Clips</Text>

      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item, index) => `video-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Video Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{spotName}</Text>
          </View>

          {selectedVideo && (
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: selectedVideo.url }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode="contain"
                shouldPlay
                useNativeControls
                style={styles.video}
              />

              {selectedVideo.caption && (
                <Text style={styles.videoCaption}>{selectedVideo.caption}</Text>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  listContent: {
    paddingHorizontal: 10,
  },
  videoItem: {
    width: 150,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  thumbnailContainer: {
    position: "relative",
  },
  thumbnail: {
    width: 150,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.medium,
  },
  playButton: {
    position: "absolute",
    top: 30,
    left: 60,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  caption: {
    color: colors.white,
    fontSize: 12,
    marginTop: 5,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: colors.secondary,
    marginTop: 10,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.medium,
  },
  closeButton: {
    marginRight: 15,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "SubwayBerlinSC",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: width,
    height: width * 0.75,
  },
  videoCaption: {
    color: colors.white,
    padding: 15,
    textAlign: "center",
  },
});

export default VideoClipsList;
