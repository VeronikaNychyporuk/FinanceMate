const Joi = require("joi");

exports.getRecommendationsQuerySchema = Joi.object({
  status: Joi.string()
    .valid("active", "seen", "dismissed", "done", "archived")
    .optional(),

  module: Joi.string()
    .valid("overview", "anomalies", "forecast", "goals", "patterns")
    .optional(),

  priority: Joi.string()
    .valid("low", "medium", "high")
    .optional(),

  groupKey: Joi.string()
    .valid("immediate_actions", "spending_optimization", "planning_ahead")
    .optional(),

  includeExpired: Joi.boolean().optional().default(false),
  includeSnoozed: Joi.boolean().optional().default(false),

  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(50).optional().default(10),
});

exports.updateRecommendationStatusSchema = Joi.object({
  status: Joi.string()
    .valid("active", "seen", "dismissed", "done", "archived")
    .required(),
});

exports.snoozeRecommendationSchema = Joi.object({
  until: Joi.date().greater("now").required(),
});