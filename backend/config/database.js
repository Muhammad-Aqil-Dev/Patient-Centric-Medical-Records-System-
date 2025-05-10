const { Sequelize } = require("sequelize");

// Use SQLite instead of MySQL to avoid database connection issues
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite", // SQLite database file
  logging: true,
});

module.exports = sequelize;
