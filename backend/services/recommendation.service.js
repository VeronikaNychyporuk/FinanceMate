const mongoose = require("mongoose");
const Recommendation = require("../models/Recommendation");
const RecommendationSnapshot = require("../models/RecommendationSnapshot");

const buildRecommendationsFilter = (userId, query) => {
  const filter = {
    userId,
  };

  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = { $ne: "archived" };
  }

  if (query.module) {
    filter.module = query.module;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.groupKey) {
    filter.groupKey = query.groupKey;
  }

  if (!query.includeExpired) {
    filter.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];
  }

  if (!query.includeSnoozed) {
    filter.$and = [
      {
        $or: [
          { snoozedUntil: null },
          { snoozedUntil: { $lte: new Date() } },
        ],
      },
    ];
  }

  return filter;
};

const mapRecommendationToResponse = (recommendation) => {
  return {
    _id: recommendation._id,
    userId: recommendation.userId,
    type: recommendation.type,
    module: recommendation.module,
    priority: recommendation.priority,
    status: recommendation.status,
    snoozedUntil: recommendation.snoozedUntil,
    groupKey: recommendation.groupKey,
    groupLabel: recommendation.groupLabel,
    title: recommendation.title,
    message: recommendation.message,
    facts: recommendation.facts,
    explanation: recommendation.explanation,
    relatedEntity: recommendation.relatedEntity,
    primaryAction: recommendation.primaryAction,
    secondaryAction: recommendation.secondaryAction,
    availableActions: recommendation.availableActions,
    context: recommendation.context,
    generatedAt: recommendation.generatedAt,
    expiresAt: recommendation.expiresAt,
    lastInteractedAt: recommendation.lastInteractedAt,
    createdAt: recommendation.createdAt,
    updatedAt: recommendation.updatedAt,
  };
};

exports.fetchRecommendations = async (userId, query) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = buildRecommendationsFilter(userId, query);

  const [items, total] = await Promise.all([
    Recommendation.find(filter)
      .sort({ priority: -1, generatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Recommendation.countDocuments(filter),
  ]);

  return {
    items: items.map(mapRecommendationToResponse),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    filters: {
      status: query.status || null,
      module: query.module || null,
      priority: query.priority || null,
      groupKey: query.groupKey || null,
      includeExpired: query.includeExpired,
      includeSnoozed: query.includeSnoozed,
    },
  };
};

exports.fetchRecommendationById = async (userId, recommendationId) => {
  if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
    throw new Error("Некоректний ідентифікатор рекомендації.");
  }

  const recommendation = await Recommendation.findOne({
    _id: recommendationId,
    userId,
  });

  if (!recommendation) {
    return null;
  }

  return mapRecommendationToResponse(recommendation);
};

exports.fetchRecommendationSnapshot = async (
  userId,
  snapshotType = "main_dashboard"
) => {
  const snapshot = await RecommendationSnapshot.findOne({
    userId,
    snapshotType,
    status: { $in: ["ready", "stale"] },
  }).sort({ generatedAt: -1 });

  if (!snapshot) {
    return null;
  }

  return {
    _id: snapshot._id,
    snapshotType: snapshot.snapshotType,
    status: snapshot.status,
    generatedAt: snapshot.generatedAt,
    validUntil: snapshot.validUntil,
    data: snapshot.data,
    meta: snapshot.meta,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
};

exports.updateRecommendationStatus = async (userId, recommendationId, status) => {
  if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
    throw new Error("Некоректний ідентифікатор рекомендації.");
  }

  const recommendation = await Recommendation.findOne({
    _id: recommendationId,
    userId,
  });

  if (!recommendation) {
    throw new Error("Рекомендацію не знайдено.");
  }

  recommendation.status = status;
  recommendation.lastInteractedAt = new Date();

  if (status === "dismissed" || status === "done" || status === "archived") {
    recommendation.snoozedUntil = null;
  }

  await recommendation.save();

  return mapRecommendationToResponse(recommendation);
};

exports.snoozeRecommendation = async (userId, recommendationId, until) => {
  if (!mongoose.Types.ObjectId.isValid(recommendationId)) {
    throw new Error("Некоректний ідентифікатор рекомендації.");
  }

  const recommendation = await Recommendation.findOne({
    _id: recommendationId,
    userId,
  });

  if (!recommendation) {
    throw new Error("Рекомендацію не знайдено.");
  }

  if (["done", "archived"].includes(recommendation.status)) {
    throw new Error("Неможливо відкласти завершену або архівовану рекомендацію.");
  }

  recommendation.snoozedUntil = new Date(until);
  recommendation.lastInteractedAt = new Date();

  if (recommendation.status === "dismissed") {
    recommendation.status = "active";
  }

  await recommendation.save();

  return mapRecommendationToResponse(recommendation);
};