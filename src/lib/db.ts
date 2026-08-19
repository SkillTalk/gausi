/**
 * Prisma client singleton — Prisma 7 with pg adapter.
 *
 * Lazy initialization: the client is not created at import time.
 * This lets Next.js build succeed without DATABASE_URL set.
 * The client is created on first use (first API call at runtime).
 *
 * Compatible with Neon, Supabase, or any standard PostgreSQL connection string.
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Add it to .env.local for local development or to your Vercel project settings.'
    );
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

// Lazy getter — client created on first property access, not at import time
let _client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (!_client) {
    _client = createClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = _client;
    }
  }
  return _client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
