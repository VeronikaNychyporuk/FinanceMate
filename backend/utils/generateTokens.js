const jwt = require("jsonwebtoken");

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_SECRET, { expiresIn: "7d" });
};

module.exports = {
  generateAccessToken,
};