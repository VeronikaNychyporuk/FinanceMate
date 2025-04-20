const Joi = require("joi");

exports.createGoalTransactionSchema = Joi.object({
  amount: Joi.number().min(0.01).required(),
  currency: Joi.string().valid("UAH", "USD", "EUR").required(),
  type: Joi.string().valid("deposit", "withdrawal").required(),
  date: Joi.date().optional(),
  note: Joi.string().allow("").optional(),
});