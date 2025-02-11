import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const spotService = {
  getAllSpots: () => api.get("/spots"),
  getNearbySpots: (latitude, longitude, maxDistance = 5000) =>
    api.get(
      `/spots/nearby?latitude=${latitude}&longitude=${longitude}&maxDistance=${maxDistance}`
    ),
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
  createSpot: (spotData) => api.post("/spots", spotData),
  uploadImage: async (formData) => {
    try {
      const response = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Upload error", error);
      throw error;
    }
  },
};

export default api;
