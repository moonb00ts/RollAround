import axios from "axios";

const BASE_URL = "http://10.167.148.198:8000/api";

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

  // Upload video with progress tracking
  uploadVideo: async (formData, onProgress = () => {}) => {
    try {
      console.log("Starting video upload");
      const response = await axios.post(`${BASE_URL}/upload/video`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted / 100);
        },
        timeout: 60000, // Even longer timeout for video uploads
      });
      console.log("Video upload successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Video upload error", error);
      console.error("Error response data:", error.response?.data);
      throw error;
    }
  },
};

export default api;
