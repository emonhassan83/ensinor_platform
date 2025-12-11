// prisma.config.js at /root/ensinor_platform/
require('dotenv').config(); // ensure DATABASE_URL is loaded

module.exports = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};
