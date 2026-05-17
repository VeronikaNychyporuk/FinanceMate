let debounceTimer = null;

export function triggerRecommendationsRefresh() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("authToken");
    if (!token) return;
    fetch("http://localhost:5000/api/recommendations/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {});
  }, 3000);
}
