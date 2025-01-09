const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('dotenv').config();

// Import models with associations
require('./models/associations');

const app = express();
const port = 3030;

// Middleware
app.use(cors());
app.use(express.json());

// Database sync - Only use force: true temporarily
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const seatRoutes = require('./routes/seats');
const bookingRoutes = require('./routes/bookings');
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
