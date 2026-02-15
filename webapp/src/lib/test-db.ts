import { prisma } from './db';

async function testConnection() {
  try {
    // Test connection by querying database metadata
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Query database version
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 Database version:', result);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
