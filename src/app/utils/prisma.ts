import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config(); // Load .env

const prisma = new PrismaClient({
   datasources: {
    db: {
      url: process.env.DATABASE_URL, // now the URL is set here
    },
  },
});

export default prisma;
