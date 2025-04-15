const { fetchExchangeRates } = require("../services/exchange.service");

exports.getExchangeRates = async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    res.status(200).json(rates);
  } catch (err) {
    res.status(500).json({ message: "Помилка при отриманні курсу валют." });
  }
};