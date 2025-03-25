const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes'); // приклад

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes); // приклад

module.exports = app;
