const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validateRequest");

const { 
    getTransactions,
    getTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
} = require("../controllers/transaction.controller");

const {
    createTransactionSchema,
    updateTransactionSchema,
} = require("../validations/transaction.validation");

router.get("/", authMiddleware, getTransactions);
router.get("/:id", authMiddleware, getTransactionById);
router.post("/", authMiddleware, validateRequest(createTransactionSchema), createTransaction);
router.patch("/:id", authMiddleware, validateRequest(updateTransactionSchema), updateTransaction);
router.delete("/:id", authMiddleware, deleteTransaction);

module.exports = router;