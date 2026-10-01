import 'dotenv/config';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Missing DATABASE_URL in .env');

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** Thư mục frontend tĩnh (../frontend). Để trống chuỗi "" để tắt phục vụ frontend. */
  frontendDir: process.env.FRONTEND_DIR === '' ? null : path.resolve(process.env.FRONTEND_DIR ?? '../frontend'),
  /** URL công khai của site, dùng cho link trong RSS. Mặc định lấy theo request. */
  siteUrl: process.env.SITE_URL || null,
};
