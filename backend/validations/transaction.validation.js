const Joi = require("joi");

exports.createTransactionSchema = Joi.object({
  amount: Joi.number().min(0.01).required(),
  type: Joi.string().valid("income", "expense").required(),
  categoryId: Joi.string().required(),
  currency: Joi.string().valid("UAH", "USD", "EUR").required(),
  date: Joi.date().optional(),
  note: Joi.string().allow("").optional(),
});

exports.updateTransactionSchema = Joi.object({
  amount: Joi.number().min(0.01).optional(),
  categoryId: Joi.string().optional(),
  currency: Joi.string().valid("UAH", "USD", "EUR").optional(),
  date: Joi.date().optional(),
  note: Joi.string().allow("").optional(),
}).or("amount", "type", "categoryId", "currency", "date", "note");