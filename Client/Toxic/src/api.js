
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000/api"
    : "https://toxicguard-api-k87a.onrender.com/api");

export default API_BASE_URL;
