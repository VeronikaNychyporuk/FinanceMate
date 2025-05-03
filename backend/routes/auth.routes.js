const express = require("express");
const router = express.Router();

const {
    register,
    verifyEmail,
    resendVerificationCode,
    login,
    forgotPassword,
    resetPassword,
    logout,
    refreshToken,
  } = require("../controllers/auth.controller");

  const {
    registerSchema,
    verifyEmailSchema,
    resendVerificationCodeSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    logoutSchema,
    refreshTokenSchema,
  } = require("../validations/auth.validation");
  
const validateRequest = require("../middlewares/validateRequest");

router.post("/register", validateRequest(registerSchema), register);
router.post("/verify-email", validateRequest(verifyEmailSchema), verifyEmail);
router.post("/resend-verification-code", validateRequest(resendVerificationCodeSchema), resendVerificationCode);
router.post("/login", validateRequest(loginSchema), login);
router.post("/forgot-password", validateRequest(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validateRequest(resetPasswordSchema), resetPassword);
router.post("/logout", validateRequest(logoutSchema), logout);
router.post("/refresh-token", validateRequest(refreshTokenSchema), refreshToken);

module.exports = router;