const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validateRequest");

const {
  getRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} = require("../controllers/recurringTransaction.controller");

const {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
} = require("../validations/recurringTransaction.validation");

router.get("/", authMiddleware, getRecurringTransactions);
router.get("/:id", authMiddleware, getRecurringTransactionById);
router.post("/", authMiddleware, validateRequest(createRecurringTransactionSchema), createRecurringTransaction);
router.patch("/:id", authMiddleware, validateRequest(updateRecurringTransactionSchema), updateRecurringTransaction);
router.delete("/:id", authMiddleware, deleteRecurringTransaction);

module.exports = router;
