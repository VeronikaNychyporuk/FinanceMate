const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validateRequest");

const {
    getGoals,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
} = require("../controllers/goal.controller");

const {
    createGoalSchema,
    updateGoalSchema,
} = require("../validations/goal.validation");

router.get("/", authMiddleware, getGoals);
router.get("/:id", authMiddleware, getGoalById);
router.post("/", authMiddleware, validateRequest(createGoalSchema), createGoal);
router.patch("/:id", authMiddleware, validateRequest(updateGoalSchema), updateGoal);
router.delete("/:id", authMiddleware, deleteGoal);

module.exports = router;