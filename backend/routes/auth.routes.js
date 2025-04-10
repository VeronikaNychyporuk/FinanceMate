const express = require("express");
const router = express.Router();

const {
    register,
    verifyEmail,
    login,
    forgotPassword,
    resetPassword,
    logout,
  } = require("../controllers/auth.controller");

  const {
    registerSchema,
    verifyEmailSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    logoutSchema,
  } = require("../validations/auth.validation");
  
const validateRequest = require("../middlewares/validateRequest");

router.post("/register", validateRequest(registerSchema), register);
router.post("/verify-email", validateRequest(verifyEmailSchema), verifyEmail);
router.post("/login", validateRequest(loginSchema), login);
router.post("/forgot-password", validateRequest(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validateRequest(resetPasswordSchema), resetPassword);
router.post("/logout", validateRequest(logoutSchema), logout);

module.exports = router;