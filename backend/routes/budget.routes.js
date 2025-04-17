const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validateRequest");

const {
    createBudgetSchema,
    updateBudgetSchema,
} = require("../validations/budget.validation");

const { 
    getAllBudgets,
    getBudgetByDate,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetOverview,
} = require("../controllers/budget.controller");

router.get("/", authMiddleware, getAllBudgets);
router.get("/by-date", authMiddleware, getBudgetByDate);
router.post("/", authMiddleware, validateRequest(createBudgetSchema), createBudget);
router.patch("/:id", authMiddleware, validateRequest(updateBudgetSchema), updateBudget);
router.delete("/:id", authMiddleware, deleteBudget);
router.get("/overview", authMiddleware, getBudgetOverview);

module.exports = router;