const Joi = require("joi");

exports.updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  currency: Joi.string().valid("UAH", "USD", "EUR").optional(),
}).or("name", "currency"); // потрібно хоча б одне поле

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
});