import 'dotenv/config';
import { pool } from '../src/config/database';
import { noteRepository } from '../src/repositories/note.repository';

/**
 * Hộp thư của Kiên — đọc và ghim bưu thiếp (không có trang admin công khai).
 *   pnpm notes                               → liệt kê note chưa ghim (riêng tư)
 *   pnpm notes pin <id>                      → ghim note lên Community Board
 *   pnpm notes pin <id> "Lời đáp" "Bối cảnh" → ghim kèm margin note trả lời
 */
async function main() {
  const [command, idArg, reply, replyContext] = process.argv.slice(2);

  if (!command || command === 'list') {
    const notes = await noteRepository.findPending();
    if (!notes.length) {
      console.log('Không có bưu thiếp nào đang chờ. ☕');
      return;
    }
    for (const n of notes) {
      console.log(`#${n.id} · ${n.date} · #${n.topic}${n.post_slug ? ` · bài: ${n.post_slug}` : ''}`);
      console.log(`  Từ: ${n.name ?? 'Anonymous'}${n.email ? ` <${n.email}>` : ''}${n.location ? ` — ${n.location}` : ''}`);
      console.log(`  "${n.message}"\n`);
    }
    console.log(`${notes.length} note đang chờ. Ghim bằng: pnpm notes pin <id> ["lời đáp"] ["bối cảnh"]`);
    return;
  }

  if (command === 'pin') {
    const id = Number(idArg);
    if (!Number.isInteger(id) || id < 1) throw new Error('Cần id hợp lệ: pnpm notes pin <id>');
    const ok = await noteRepository.pin(id, reply ?? null, replyContext ?? null);
    console.log(ok ? `Đã ghim note #${id} lên Community Board.` : `Không tìm thấy note #${id}.`);
    return;
  }

  throw new Error(`Lệnh không hợp lệ: ${command}. Dùng "list" hoặc "pin".`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
