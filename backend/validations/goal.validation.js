const Joi = require("joi");

exports.createGoalSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  targetAmount: Joi.number().min(0.01).required(),
  deadline: Joi.date().greater("now").required(),
});

exports.updateGoalSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    targetAmount: Joi.number().min(0.01).optional(),
    deadline: Joi.date().greater("now").optional(),
  }).or("name", "targetAmount", "deadline");