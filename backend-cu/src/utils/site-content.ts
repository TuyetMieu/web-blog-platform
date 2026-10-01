import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * Nội dung mẫu dùng chung với frontend: ../frontend/data/site-content.js.
 * File đó là script trình duyệt gán window.KJ_CONTENT, nên chạy nó trong
 * một sandbox vm để lấy dữ liệu — seed và /api/about dùng CHUNG 1 nguồn với
 * chế độ offline của frontend.
 */
export type SitePost = {
  slug: string;
  title: string;
  excerpt?: string | null;
  side: 'engineering' | 'life';
  category?: string | null;
  tags?: string[];
  cover?: string | null;
  date: string;
  featured?: boolean;
  reads?: number;
  reactions?: Record<string, number>;
  extra?: Record<string, unknown>;
  content: string;
};

export type SiteNote = {
  name?: string | null;
  role?: string | null;
  location?: string | null;
  topic: string;
  message: string;
  date: string;
  reply?: string | null;
  replyContext?: string | null;
  postSlug?: string | null;
};

export type SiteContent = { posts: SitePost[]; notes: SiteNote[]; about: Record<string, unknown> };

export const SITE_CONTENT_FILE = path.resolve(
  process.env.SITE_CONTENT_FILE ?? path.join(process.cwd(), '..', 'frontend', 'data', 'site-content.js'),
);

export function loadSiteContent(file: string = SITE_CONTENT_FILE): SiteContent {
  const sandbox: { window: { KJ_CONTENT?: SiteContent } } = { window: {} };
  vm.runInNewContext(readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 1000 });
  const content = sandbox.window.KJ_CONTENT;
  if (!content || !Array.isArray(content.posts)) {
    throw new Error(`${file} không gán window.KJ_CONTENT hợp lệ`);
  }
  return content;
}
