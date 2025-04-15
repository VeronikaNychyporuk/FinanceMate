const axios = require("axios");

exports.fetchExchangeRates = async () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateString = `${yyyy}${mm}${dd}`;

  const baseUrl = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange";

  const getRate = async (valcode) => {
    const url = `${baseUrl}?valcode=${valcode}&date=${dateString}&json`;
    const response = await axios.get(url);
    const data = response.data;

    if (!data || !data.length) throw new Error(`Не знайдено курс для ${valcode}`);
    return data[0].rate;
  };

  const [usdRate, eurRate] = await Promise.all([
    getRate("USD"),
    getRate("EUR"),
  ]);

  return {
    USD: usdRate,
    EUR: eurRate,
    date: `${yyyy}-${mm}-${dd}`,
  };
};
