const express = require("express");
const router = express.Router();

const { register, verifyEmail } = require("../controllers/auth.controller");
const { verifyEmailSchema } = require("../validations/auth.validation");
const validateRequest = require("../middlewares/validateRequest");
const { registerSchema } = require("../validations/auth.validation");

router.post("/register", validateRequest(registerSchema), register);
router.post("/verify-email", validateRequest(verifyEmailSchema), verifyEmail);

module.exports = router;