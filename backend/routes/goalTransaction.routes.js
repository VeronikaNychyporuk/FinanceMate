const express = require("express");
const router = express.Router({ mergeParams: true });
const authMiddleware = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validateRequest");

const {
    getGoalTransactions,
    createGoalTransaction,
    deleteGoalTransaction,
} = require("../controllers/goalTransaction.controller");

const {
    createGoalTransactionSchema,
} = require("../validations/goalTransaction.validation");

router.get("/", authMiddleware, getGoalTransactions);
router.post("/", authMiddleware, validateRequest(createGoalTransactionSchema), createGoalTransaction);
router.delete("/:transactionId", authMiddleware, deleteGoalTransaction);

module.exports = router;