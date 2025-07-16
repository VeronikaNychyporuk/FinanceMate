const Joi = require("joi");

exports.createRecurringTransactionSchema = Joi.object({
  amount: Joi.number().min(0.01).required(),
  type: Joi.string().valid("income", "expense").required(),
  categoryId: Joi.string().required(),
  currency: Joi.string().valid("UAH", "USD", "EUR").required(),
  frequency: Joi.string().valid("daily", "weekly", "monthly", "yearly").required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().optional(),
  note: Joi.string().allow("").optional(),
});

exports.updateRecurringTransactionSchema = Joi.object({
  amount: Joi.number().min(0.01).optional(),
  type: Joi.string().valid("income", "expense").optional(),
  categoryId: Joi.string().optional(),
  currency: Joi.string().valid("UAH", "USD", "EUR").optional(),
  frequency: Joi.string().valid("daily", "weekly", "monthly", "yearly").optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  note: Joi.string().allow("").optional(),
  isActive: Joi.boolean().optional(),
}).or("amount", "type", "categoryId", "currency", "frequency", "startDate", "endDate", "note", "isActive");
