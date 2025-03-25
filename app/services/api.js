import axios from "axios";

const BASE_URL = "http://10.167.106.44:8000/api";

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

  // Add video to spot
  addVideoToSpot: async (spotId, videoData) => {
    try {
      console.log(`Adding video to spot ${spotId}`);

      if (!spotId) {
        throw new Error("No spotId provided to addVideoToSpot");
      }

      // Make sure userName is explicitly included - important!
      if (!videoData.userName) {
        console.warn("No userName in videoData, this will cause issues");
      }

      // Log exactly what we're sending
      console.log("Raw videoData:", videoData);
      console.log("userName in request:", videoData.userName);
      console.log("uploadedBy in request:", videoData.uploadedBy);

      // Deep clone to make sure we don't modify the original
      const payload = JSON.parse(
        JSON.stringify({
          url: videoData.url,
          thumbnail: videoData.thumbnail || videoData.url,
          caption: videoData.caption || "",
          description: videoData.description || "",
          userName: videoData.userName || "Anonymous", // Make sure this is included
          uploadedBy: videoData.uploadedBy || "unknown",
        })
      );

      console.log("Final payload being sent:", payload);

      // Make sure axios sends the right content type
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      // Use axios directly with specific config
      const response = await axios.post(
        `${BASE_URL}/spots/${spotId}/videos`,
        payload,
        config
      );

      console.log("Response headers:", response.headers);
      console.log("Response status:", response.status);
      console.log("Response data summary:", {
        videos: response.data?.videos?.length || 0,
      });

      return response.data;
    } catch (error) {
      console.error("Error adding video to spot:", error);

      // Enhanced error logging
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error setting up request:", error.message);
      }

      throw error;
    }
  },
  incrementVideoLikes: async (spotId, videoId) => {
    try {
      console.log(`Incrementing likes for video ${videoId} in spot ${spotId}`);

      if (!spotId) {
        console.error("No spotId provided to incrementVideoLikes");
        throw new Error("spotId is required");
      }

      if (!videoId) {
        console.error("No videoId provided to incrementVideoLikes");
        throw new Error("videoId is required");
      }

      // Send request to increment the like count
      const response = await api.post(
        `/spots/${spotId}/videos/${videoId}/like`
      );
      console.log("Like increment successful:", response.data);
      return response.data;
    } catch (error) {
      console.error(`Error incrementing likes for video ${videoId}:`, error);

      // Detailed error logging
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error setting up request:", error.message);
      }

      throw error;
    }
  },
};

// Add these methods to your existing api.js file
export const eventService = {
  // Get all events
  getAllEvents: () => api.get("/events"),

  // Get events by date range
  getEventsByDateRange: (startDate, endDate) =>
    api.get(`/events/range?start=${startDate}&end=${endDate}`),

  // Get single event by ID
  getEvent: (id) => api.get(`/events/${id}`),

  // Create new event
  createEvent: (eventData) => api.post("/events", eventData),

  // Update event
  updateEvent: (id, eventData) => api.patch(`/events/${id}`, eventData),

  // Delete event
  deleteEvent: (id) => api.delete(`/events/${id}`),

  // Upload image with progress tracking
  uploadImage: async (formData, onProgress = () => {}) => {
    try {
      console.log("Starting image upload for event");
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

  // Get events near a location
  getNearbyEvents: (latitude, longitude, maxDistance = 10000) =>
    api.get(
      `/events/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=${maxDistance}`
    ),
};

export default api;
