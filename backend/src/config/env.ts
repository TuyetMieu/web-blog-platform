import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Missing DATABASE_URL in .env');

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
