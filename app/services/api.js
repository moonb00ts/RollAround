import axios from "axios";

const BASE_URL = "http://10.167.81.75:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const spotService = {
  //Get all spots
  getAllSpots: () => api.get("/spots"),

  //Get spots near location
  getNearbySpots: (latitude, longitude, maxDistance = 5000) =>
    api.get(
      `/spots/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=${maxDistance}`
    ),
  //Get single spot by ID
  getSpot: async (id) => {
    console.log(`Making API request to: /spots/${id}`);

    // Ensure ID is properly handled
    const encodedId = encodeURIComponent(id.toString().trim());
    const url = `/spots/${encodedId}`;

    console.log("Final API URL:", BASE_URL + url);

    try {
      const response = await api.get(url);
      console.log("API response status:", response.status);
      return response;
    } catch (error) {
      console.error("API error in getSpot:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      } else if (error.request) {
        console.error("No response received for request");
      }
      throw error;
    }
  },

  // Create new spot
  createSpot: (spotData) => api.post("/spots", spotData),

  // Get clips for a spot
  getClipsBySpot: (spotId) => api.get(`/clips?spotId=${spotId}`),

  // Create a new clip
  createClip: (clipData) => api.post("/clips", clipData),

  // Like/unlike clips
  likeClip: (clipId, userId) => api.post(`/clips/${clipId}/like`, { userId }),
  unlikeClip: (clipId, userId) =>
    api.post(`/clips/${clipId}/unlike`, { userId }),

  // Comment on a clip
  addComment: (clipId, comment) =>
    api.post(`/clips/${clipId}/comments`, comment),
  getComments: (clipId) => api.get(`/clips/${clipId}/comments`),

  // Test connection
  testConnection: async () => {
    try {
      console.log("Starting connection test to:", BASE_URL + "/spots");
      const response = await api.get("/spots");
      console.log("Connection successful!");
      return response.data;
    } catch (error) {
      console.error("Connection attempt failed with:", {
        error: error.message,
        url: BASE_URL,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  },

  // Upload image with progress tracking
  uploadImage: async (formData, onProgress = () => {}) => {
    try {
      console.log("Starting image upload");
      const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted / 100);
        },
        timeout: 30000, // Longer timeout for uploads
      });
      console.log("Upload successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Upload error", error);
      console.error("Error response data:", error.response?.data);
      throw error;
    }
  },

  // Upload media (both images and videos)
  uploadMedia: async (formData, onProgress) => {
    console.log("Starting media upload in spotService");
    try {
      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: onProgress
          ? (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          : undefined,
      });
      console.log("Upload successful in spotService:", response.data);
      return response.data;
    } catch (error) {
      console.error("Upload error in spotService:", error);
      console.error("Error response data:", error.response?.data);
      throw error;
    }
  },

  // Upload video with progress tracking
  uploadMedia: async (formData, onProgress) => {
    console.log("Starting media upload in spotService");
    try {
      // Get the file type from the formData to determine if it's a video
      let fileType = "unknown";
      let fileName = "unknown";

      // Attempt to extract file info for logging
      try {
        if (formData._parts && formData._parts.length > 0) {
          for (const part of formData._parts) {
            if (
              part &&
              part.length > 1 &&
              part[0] === "file" &&
              typeof part[1] === "object"
            ) {
              const file = part[1];
              fileType = file.type || "unknown";
              fileName = file.name || "unknown";
              console.log(`Uploading file: ${fileName}, type: ${fileType}`);
              break;
            }
          }
        }
      } catch (err) {
        console.log("Could not extract file info from FormData:", err.message);
      }

      // Make the request
      console.log(`Making upload request to: ${BASE_URL}/upload`);
      const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: onProgress
          ? (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          : undefined,
        timeout: fileType.startsWith("video/") ? 60000 : 30000, // Longer timeout for videos
      });

      console.log("Upload successful. Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Upload error in spotService:", error);

      // Enhanced error logging
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      } else if (error.request) {
        console.error("No response received");
      } else {
        console.error("Error setting up request:", error.message);
      }

      throw error;
    }
  },

  addVideoToSpot: async (spotId, videoData) => {
    try {
      console.log(`Adding video to spot ${spotId} using direct endpoint`);

      // Build the video object to send to the server
      const payload = {
        url: videoData.videoUrl,
        thumbnail: videoData.thumbnailUrl,
        caption: videoData.title,
        description: videoData.description || "",
        userId: videoData.userId,
        userName: videoData.userName || "Anonymous",
      };

      console.log("Video payload:", payload);

      // Use a dedicated endpoint for adding videos
      const response = await api.post(`/spots/${spotId}/videos`, payload);

      console.log("Video successfully added to spot");
      return response.data;
    } catch (error) {
      console.error("Error adding video to spot:", error);
      throw error;
    }
  },
};

export default api;
