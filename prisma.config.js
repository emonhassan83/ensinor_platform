require('dotenv').config(); // Load .env

module.exports = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};
