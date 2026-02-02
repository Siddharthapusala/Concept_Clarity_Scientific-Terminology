import axios from "axios";
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_API_URL_PROD || process.env.REACT_APP_API_URL
    : process.env.REACT_APP_API_URL_LOCAL || process.env.REACT_APP_API_URL || "";

export const api = axios.create({
  baseURL: API_BASE_URL,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
