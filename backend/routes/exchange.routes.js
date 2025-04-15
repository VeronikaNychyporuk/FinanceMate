const express = require("express");
const router = express.Router();
const { getExchangeRates } = require("../controllers/exchange.controller");

router.get("/", getExchangeRates);

module.exports = router;