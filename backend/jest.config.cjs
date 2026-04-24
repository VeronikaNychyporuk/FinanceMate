module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "utils/**/*.js",
    "middlewares/**/*.js",
    "validations/**/*.js",
    "services/recommendations/algorithms/**/*.js",
    "!**/node_modules/**"
  ],
  coverageDirectory: "coverage",
  clearMocks: true,
};