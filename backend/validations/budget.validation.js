const Joi = require("joi");
const mongoose = require("mongoose");

exports.createBudgetSchema = Joi.object({
  totalLimit: Joi.number().min(0.01).required(),
  currency: Joi.string().valid("UAH", "USD", "EUR").required(),
  period: Joi.object({
    month: Joi.number().min(1).max(12).required(),
    year: Joi.number().min(2000).required(),
  }).required(),
  categoryLimits: Joi.array().items(
    Joi.object({
      categoryId: Joi.string()
        .custom((value, helpers) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error("any.invalid");
          }
          return value;
        }, "ObjectId validation")
        .required(),
      limit: Joi.number().min(0.01).required(),
    })
  ).optional(),
});

exports.updateBudgetSchema = Joi.object({
  totalLimit: Joi.number().min(0.01).optional(),
  currency: Joi.string().valid("UAH", "USD", "EUR").optional(),
  period: Joi.object({
    month: Joi.number().min(1).max(12).required(),
    year: Joi.number().min(2000).required(),
  }).optional(),
  categoryLimits: Joi.array().items(
    Joi.object({
      categoryId: Joi.string().required(),
      limit: Joi.number().min(0.01).required(),
    })
  ).optional(),
}).or("totalLimit", "currency", "period", "categoryLimits");