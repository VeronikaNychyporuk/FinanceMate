const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const validateRequest = require("../middlewares/validateRequest");

const { 
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} = require("../controllers/category.controller");

const { 
    createCategorySchema,
    updateCategorySchema,
} = require("../validations/category.validation");

router.get("/", authMiddleware, getAllCategories);
router.post("/", authMiddleware, validateRequest(createCategorySchema), createCategory);
router.patch("/:id", authMiddleware, validateRequest(updateCategorySchema), updateCategory);
router.delete("/:id", authMiddleware, deleteCategory);

module.exports = router;