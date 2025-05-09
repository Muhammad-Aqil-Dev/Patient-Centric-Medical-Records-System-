const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('medicalrecordsharing', 'root', 'root', {
  host: 'localhost',
  dialect: 'mysql',
  logging: true, // Set to true if you want to see SQL queries
});

module.exports = sequelize;