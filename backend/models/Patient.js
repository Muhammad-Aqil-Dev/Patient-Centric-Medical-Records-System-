const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patient = sequelize.define('Patient', {
  name: { type: DataTypes.STRING, allowNull: false },
  age: { type: DataTypes.INTEGER, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false }, // wallet address
}, {
  tableName: 'patients',
  timestamps: true,
});

module.exports = Patient;