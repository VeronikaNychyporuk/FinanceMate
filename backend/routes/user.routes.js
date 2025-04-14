const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");

const {
    getProfile,
    updateProfile,
    changePassword,
  } = require("../controllers/user.controller");

const {
    updateProfileSchema,
    changePasswordSchema,
  } = require("../validations/user.validation");

const validateRequest = require("../middlewares/validateRequest");

router.get("/profile", authMiddleware, getProfile);
router.patch("/profile", authMiddleware, validateRequest(updateProfileSchema), updateProfile);
router.patch("/change-password", authMiddleware, validateRequest(changePasswordSchema), changePassword);

module.exports = router;