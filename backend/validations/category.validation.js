const Joi = require("joi");

exports.createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  type: Joi.string().valid("income", "expense").required(),
  icon: Joi.string().allow("").optional(),
});

exports.updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  type: Joi.string().valid("income", "expense").optional(),
  icon: Joi.string().allow("").optional(),
}).or("name", "type", "icon");