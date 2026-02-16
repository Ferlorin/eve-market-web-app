import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  // Reduced connection pool to prevent overwhelming CockroachDB/Neon
  // Vercel serverless: 2 connections per instance
  // GitHub Actions/local: 5 connections
  max: process.env.VERCEL ? 2 : 5,
  // Close idle connections faster to free up resources
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 5000,
  // Allow connections to be reused
  allowExitOnIdle: false,
});

const adapter = new PrismaPg(pool);

// Singleton pattern for Prisma Client
// Prevents exhausting database connections during hot reload in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
