function resolveApiBaseUrl() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // Always use local /api on AI Studio preview/deployed Cloud Run or localhost
    // so cross-origin Render VITE_API_URL never triggers a CORS Network Error.
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".run.app") ||
      host.endsWith(".ai.studio")
    ) {
      return "/api";
    }
  }

  const rawEnvUrl = (import.meta.env.VITE_API_URL || "").trim();
  if (!rawEnvUrl) {
    return "/api";
  }

  const trimmed = rawEnvUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const API_BASE_URL = resolveApiBaseUrl();

export default API_BASE_URL;
