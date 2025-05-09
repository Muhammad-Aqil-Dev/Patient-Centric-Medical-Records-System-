const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Doctor = sequelize.define('Doctor', {
  name: { type: DataTypes.STRING, allowNull: false },
  specialization: { type: DataTypes.STRING, allowNull: false },
  experience: { type: DataTypes.INTEGER, allowNull: false },
  hospital: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false }, // wallet address
}, {
  tableName: 'doctors',
  timestamps: true,
});

module.exports = Doctor;
