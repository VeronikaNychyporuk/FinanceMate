const {
  fetchRecommendations,
  fetchRecommendationById,
  fetchRecommendationSnapshot,
  updateRecommendationStatus,
  snoozeRecommendation,
} = require("../services/recommendation.service");

const {
  generateRecommendationsForUser,
} = require("../services/recommendationGeneration.service");

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

exports.patchRecommendationSnooze = async (req, res) => {
  try {
    const updated = await snoozeRecommendation(
      req.userId,
      req.params.id,
      req.body.until
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