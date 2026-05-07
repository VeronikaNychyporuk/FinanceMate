const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validateRequest");
const validateQuery = require("../middlewares/validateQuery");

const {
  getRecommendations,
  getRecommendationById,
  getRecommendationSnapshot,
  patchRecommendationStatus,
  generateRecommendations,
} = require("../controllers/recommendation.controller");

const {
  getRecommendationsQuerySchema,
  updateRecommendationStatusSchema,
} = require("../validations/recommendation.validation");

router.get(
  "/",
  authMiddleware,
  validateQuery(getRecommendationsQuerySchema),
  getRecommendations
);

router.post(
  "/generate",
  authMiddleware,
  generateRecommendations
);

router.get(
  "/snapshot",
  authMiddleware,
  getRecommendationSnapshot
);

router.get(
  "/:id",
  authMiddleware,
  getRecommendationById
);

router.patch(
  "/:id/status",
  authMiddleware,
  validateRequest(updateRecommendationStatusSchema),
  patchRecommendationStatus
);

module.exports = router;