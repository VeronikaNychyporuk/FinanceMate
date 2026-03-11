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
  patchRecommendationSnooze,
} = require("../controllers/recommendation.controller");

const {
  getRecommendationsQuerySchema,
  updateRecommendationStatusSchema,
  snoozeRecommendationSchema,
} = require("../validations/recommendation.validation");

router.get(
  "/",
  authMiddleware,
  validateQuery(getRecommendationsQuerySchema),
  getRecommendations
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

router.patch(
  "/:id/snooze",
  authMiddleware,
  validateRequest(snoozeRecommendationSchema),
  patchRecommendationSnooze
);

module.exports = router;