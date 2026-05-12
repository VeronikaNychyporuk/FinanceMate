const app = require('./app');
const mongoose = require('mongoose');
require('dotenv').config();

const { startRecommendationScheduler, stopRecommendationScheduler } = require('./jobs/recommendationScheduler');
const { closeAllConnections } = require('./controllers/recommendation.controller');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');

    require('./utils/createRecurringTransactions');
    startRecommendationScheduler();

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));

const shutdown = () => {
  console.log('Зупинка сервера...');
  stopRecommendationScheduler();
  closeAllConnections();
  mongoose.connection.close(() => {
    console.log('З\'єднання з MongoDB закрито.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
