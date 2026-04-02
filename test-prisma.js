require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PgAdapter } = require('@prisma/adapter-pg');

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('Initializing PrismaClient with PgAdapter...');

try {
  const adapter = new PgAdapter({
    url: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });
  console.log('PrismaClient created successfully');
  prisma.$disconnect();
  console.log('Disconnected');
} catch (error) {
  console.error('Error:', error.message);
}
