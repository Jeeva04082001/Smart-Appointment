import axios from "axios";
import toast from "react-hot-toast";



const API = axios.create({
  baseURL: "http://localhost:8011/api",
});

// 🔥 ADD THIS INTERCEPTOR
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// ✅ RESPONSE INTERCEPTOR (handle expiry)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.code === "token_not_valid" || error.response?.status === 401) {
      toast.error("Session expired. Please login again.");
      // 🔥 clear token
      localStorage.removeItem("token");

      // 🔥 redirect to login
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);



export default API;