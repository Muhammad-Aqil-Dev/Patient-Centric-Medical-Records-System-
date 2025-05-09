// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const ipfsRoutes = require('./routes/ipfsRoutes');
const authRoutes = require('./routes/authRoutes');
const sequelize = require('./config/database');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');



const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/ipfs', ipfsRoutes);

app.use(ipfsRoutes)
app.use("/api/auth",authRoutes)
app.get('/', (req, res) => {
  res.send('Patient Records Backend is running 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Sync and start server
sequelize.sync({ alter: true }) // use { force: true } to drop and recreate tables
.then(() => {
  console.log('Database synced');
  // Start your server here
})
.catch(err => {
  console.error('Database sync failed:', err);
});
});
