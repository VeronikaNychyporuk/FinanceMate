const jwt = require("jsonwebtoken");
const eventBus = require("../utils/eventBus");

const {
  fetchRecommendations,
  fetchRecommendationById,
  fetchRecommendationSnapshot,
  updateRecommendationStatus,
} = require("../services/recommendation.service");

const {
  generateRecommendationsForUser,
} = require("../services/recommendationGeneration.service");

// Map<userId, Set<res>> — активні SSE-з'єднання
const activeConnections = new Map();

const addConnection = (userId, res) => {
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId).add(res);
};

const removeConnection = (userId, res) => {
  const connections = activeConnections.get(userId);
  if (!connections) return;
  connections.delete(res);
  if (connections.size === 0) activeConnections.delete(userId);
};

const sendEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

exports.closeAllConnections = () => {
  for (const connections of activeConnections.values()) {
    for (const res of connections) {
      res.end();
    }
  }
  activeConnections.clear();
};

exports.getRecommendations = async (req, res) => {
  try {
    const result = await fetchRecommendations(req.userId, req.query);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Не вдалося отримати список рекомендацій." });
  }
};

exports.getRecommendationById = async (req, res) => {
  try {
    const recommendation = await fetchRecommendationById(req.userId, req.params.id);

    if (!recommendation) {
      return res.status(404).json({ message: "Рекомендацію не знайдено." });
    }

    res.status(200).json(recommendation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getRecommendationSnapshot = async (req, res) => {
  try {
    const snapshot = await fetchRecommendationSnapshot(req.userId);

    if (!snapshot) {
      return res.status(404).json({ message: "Snapshot рекомендацій не знайдено." });
    }

    res.status(200).json(snapshot);
  } catch (err) {
    res.status(500).json({ message: "Не вдалося отримати snapshot рекомендацій." });
  }
};

exports.patchRecommendationStatus = async (req, res) => {
  try {
    const updated = await updateRecommendationStatus(
      req.userId,
      req.params.id,
      req.body.status
    );

    res.status(200).json(updated);
  } catch (err) {
    const statusCode =
      err.message === "Рекомендацію не знайдено." ? 404 : 400;

    res.status(statusCode).json({ message: err.message });
  }
};

exports.generateRecommendations = async (req, res) => {
  try {
    const result = await generateRecommendationsForUser(req.userId);

    res.status(200).json({
      message: "Рекомендації та snapshot успішно згенеровано.",
      ...result,
    });
  } catch (err) {
    res.status(500).json({
      message: "Не вдалося згенерувати рекомендації.",
      error: err.message,
    });
  }
};

exports.streamRecommendations = (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ message: "Токен відсутній." });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ message: "Недійсний або протермінований токен." });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addConnection(userId, res);

  sendEvent(res, "connected", { message: "SSE з'єднання встановлено." });

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 30000);

  const onUpdate = ({ userId: updatedUserId }) => {
    if (String(updatedUserId) === String(userId)) {
      sendEvent(res, "recommendation:updated", { timestamp: new Date().toISOString() });
    }
  };

  eventBus.on("recommendation:updated", onUpdate);

  req.on("close", () => {
    clearInterval(heartbeat);
    eventBus.removeListener("recommendation:updated", onUpdate);
    removeConnection(userId, res);
  });
};