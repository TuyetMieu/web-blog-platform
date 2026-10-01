/**
 * Smoke test cho API — cần server đang chạy và dữ liệu vừa seed:
 *   pnpm seed:reset && pnpm dev   (terminal 1)
 *   pnpm test:api                 (terminal 2)
 * Đổi địa chỉ bằng API_URL=http://host:port
 */
const BASE = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${err instanceof Error ? err.message : err}`);
  }
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await res.json() : await res.text();
  return { status: res.status, type, data: data as any };
}

async function main() {
  console.log(`API smoke test → ${BASE}`);

  await check('GET /api/posts trả danh sách có total/per_page', async () => {
    const { status, data } = await call('GET', '/api/posts');
    assert(status === 200, `status ${status}`);
    assert(data.total >= 1 && data.per_page === 6 && Array.isArray(data.posts), 'shape sai');
    const p = data.posts[0];
    for (const k of ['slug', 'title', 'side', 'category', 'tags', 'reactions', 'read_minutes', 'reads', 'extra']) {
      assert(k in p, `thiếu field ${k}`);
    }
    assert(Object.keys(p.reactions).sort().join() === 'calm,insight,resonate,tea', 'reaction types sai');
  });

  await check('lọc side + category + per_page', async () => {
    const { data } = await call('GET', '/api/posts?side=engineering&category=Architecture&per_page=2');
    assert(data.posts.length <= 2, 'per_page không áp dụng');
    assert(data.posts.every((p: any) => p.side === 'engineering' && p.category === 'Architecture'), 'lọc sai');
  });

  await check('sort=reads sắp xếp theo lượt đọc giảm dần', async () => {
    const { data } = await call('GET', '/api/posts?sort=reads&per_page=5');
    const reads = data.posts.map((p: any) => p.reads);
    assert(reads.every((r: number, i: number) => i === 0 || reads[i - 1] >= r), `thứ tự sai: ${reads}`);
  });

  await check('featured=true và slugs=a,b', async () => {
    const f = await call('GET', '/api/posts?featured=true');
    assert(f.data.posts.length > 0 && f.data.posts.every((p: any) => p.featured), 'featured sai');
    const slugs = f.data.posts.slice(0, 2).map((p: any) => p.slug);
    const s = await call('GET', `/api/posts?slugs=${slugs.join(',')}`);
    assert(s.data.total === slugs.length, 'slugs filter sai');
  });

  await check('tham số không hợp lệ → 400', async () => {
    const a = await call('GET', '/api/posts?side=nope');
    const b = await call('GET', '/api/posts?per_page=999');
    assert(a.status === 400 && b.status === 400, `status ${a.status}/${b.status}`);
  });

  await check('GET /api/posts/categories', async () => {
    const { data } = await call('GET', '/api/posts/categories');
    assert(Array.isArray(data) && data.length > 0 && 'side' in data[0] && 'count' in data[0], 'shape sai');
  });

  let slug = '';
  await check('GET /api/posts/:slug có content + prev/next', async () => {
    const list = await call('GET', '/api/posts?per_page=3');
    slug = list.data.posts[1].slug;
    const { status, data } = await call('GET', `/api/posts/${slug}`);
    assert(status === 200 && typeof data.content === 'string' && data.content.length > 0, 'thiếu content');
    assert(data.prev?.slug === list.data.posts[0].slug, 'prev (bài mới hơn) sai');
    assert(data.next?.slug === list.data.posts[2].slug, 'next (bài cũ hơn) sai');
  });

  await check('GET /api/posts/khong-ton-tai → 404', async () => {
    const { status } = await call('GET', '/api/posts/khong-ton-tai');
    assert(status === 404, `status ${status}`);
  });

  await check('POST /api/posts/:slug/react tăng đúng 1', async () => {
    const before = (await call('GET', `/api/posts/${slug}`)).data.reactions.tea;
    const { status, data } = await call('POST', `/api/posts/${slug}/react`, { type: 'tea' });
    assert(status === 200 && data.type === 'tea' && data.count === before + 1, `count ${data.count} vs ${before}`);
    const bad = await call('POST', `/api/posts/${slug}/react`, { type: 'like' });
    assert(bad.status === 400, 'type cũ "like" phải bị từ chối');
  });

  await check('POST /api/posts/:slug/read tăng lượt đọc', async () => {
    const before = (await call('GET', `/api/posts/${slug}`)).data.reads;
    const { data } = await call('POST', `/api/posts/${slug}/read`);
    assert(data.reads === before + 1, `reads ${data.reads} vs ${before}`);
  });

  await check('GET /api/notes chỉ trả note đã ghim, không lộ email', async () => {
    const { data } = await call('GET', '/api/notes?per_page=4');
    assert(data.total >= 1 && data.notes.length <= 4, 'shape sai');
    assert(data.notes.every((n: any) => !('email' in n)), 'lộ email');
  });

  await check('POST /api/notes tạo note riêng tư (không hiện trên board)', async () => {
    const marker = `smoke-${Date.now()}`;
    const { status, data } = await call('POST', '/api/notes', { message: marker, topic: 'AtticMusings', post_slug: slug });
    assert(status === 201 && data.ok === true, `status ${status}`);
    const board = await call('GET', `/api/notes?q=${marker}`);
    assert(board.data.total === 0, 'note chưa ghim không được công khai');
  });

  await check('POST /api/notes validate → { ok:false }', async () => {
    const a = await call('POST', '/api/notes', { message: '', topic: 'AtticMusings' });
    const b = await call('POST', '/api/notes', { message: 'hi', topic: 'general' });
    assert(a.status === 400 && a.data.ok === false, 'message rỗng phải 400');
    assert(b.status === 400 && b.data.error === 'Invalid topic', 'topic cũ phải bị từ chối');
  });

  await check('GET /api/about', async () => {
    const { status, data } = await call('GET', '/api/about');
    assert(status === 200 && typeof data.name === 'string' && data.now, 'shape sai');
  });

  await check('GET /api/rss trả RSS 2.0', async () => {
    const { status, type, data } = await call('GET', '/api/rss');
    assert(status === 200 && type.includes('rss') && String(data).includes('<rss version="2.0"'), 'không phải RSS');
  });

  await check('Frontend tĩnh + chặn mã backend', async () => {
    const home = await call('GET', '/');
    const secret = await call('GET', '/backend/.env.example');
    const apiMiss = await call('GET', '/api/khong-co');
    assert(home.status === 200 && String(home.data).includes("Kiên's Journal"), 'không phục vụ index.html');
    assert(secret.status === 404, 'lộ file backend');
    assert(apiMiss.status === 404 && apiMiss.type.includes('json'), 'API 404 phải là JSON');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
