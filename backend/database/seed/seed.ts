
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const reset = process.argv.includes('--reset');

const REACTIONS = ['like', 'love', 'funny', 'useful'];

const TAGS = [
  'typescript',
  'nodejs',
  'postgres',
  'react',
  'design',
  'career',
  'travel',
  'coffee',
];

const POSTS = [
  {
    side: 'engineering',
    title: 'Thiết kế REST API sạch với Express',
    excerpt:
      'Một cách tổ chức Express backend đơn giản, dễ đọc và đủ linh hoạt cho một ứng dụng cá nhân.',
    tags: ['nodejs', 'typescript'],
    cover: '/images/covers/rest-api.jpg',
    content: `
      <h2>Bắt đầu từ contract</h2>
      <p>
        Một REST API dễ maintain không nhất thiết phải có thật nhiều abstraction.
        Điều quan trọng hơn là mỗi layer có một trách nhiệm rõ ràng.
      </p>

      <h3>Controller</h3>
      <p>
        Controller nhận HTTP request, kiểm tra input và chuyển công việc cho service.
        Nó không nên biết quá nhiều về cách dữ liệu được lưu trong database.
      </p>

      <h3>Service</h3>
      <p>
        Business logic nên nằm ở service để có thể tái sử dụng và kiểm thử độc lập.
      </p>

      <pre><code>GET /api/posts
GET /api/posts/:slug</code></pre>

      <p>
        Với một project nhỏ, kiến trúc đơn giản nhưng có ranh giới rõ ràng thường
        hữu ích hơn một hệ thống abstraction quá phức tạp.
      </p>
    `,
  },

  {
    side: 'engineering',
    title: 'PostgreSQL index: khi nào nên dùng',
    excerpt:
      'Index có thể làm query nhanh hơn đáng kể, nhưng không phải column nào cũng cần index.',
    tags: ['postgres'],
    cover: '/images/covers/postgres-index.jpg',
    content: `
      <h2>Index không phải phép màu</h2>
      <p>
        Database index giúp PostgreSQL tìm dữ liệu nhanh hơn thay vì phải quét toàn bộ
        bảng trong nhiều trường hợp.
      </p>

      <p>
        Tuy nhiên, mỗi index cũng làm tăng chi phí khi insert và update dữ liệu.
        Vì vậy index nên xuất hiện dựa trên query thực tế thay vì được thêm một cách máy móc.
      </p>

      <h3>Một ví dụ đơn giản</h3>
      <pre><code>CREATE INDEX idx_posts_date
ON posts(date DESC);</code></pre>

      <p>
        Nếu màn hình chính thường xuyên lấy các bài viết mới nhất,
        index trên date có thể trở nên hữu ích.
      </p>
    `,
  },

  {
    side: 'life',
    title: 'Một tuần ở Đà Lạt',
    excerpt:
      'Một tuần chậm lại giữa những con dốc, quán cà phê nhỏ và những buổi sáng nhiều sương.',
    tags: ['travel', 'coffee'],
    cover: '/images/covers/da-lat.jpg',
    content: `
      <h2>Bảy ngày không cần quá nhiều kế hoạch</h2>
      <p>
        Tôi đến Đà Lạt với một danh sách khá ngắn: tìm vài quán cà phê,
        đi bộ nhiều hơn và hoàn thành một cuốn sách đang đọc dở.
      </p>

      <p>
        Buổi sáng ở đây bắt đầu chậm. Không có quá nhiều thông báo,
        không có lịch họp liên tục và cũng không có cảm giác phải hoàn thành
        mọi thứ trước buổi trưa.
      </p>

      <blockquote>
        Có những chuyến đi không cho mình câu trả lời,
        nhưng lại giúp mình đặt câu hỏi đúng hơn.
      </blockquote>

      <p>
        Đến cuối tuần, điều đáng nhớ nhất không phải là địa điểm cụ thể
        mà là cảm giác có thêm một chút khoảng trống trong đầu.
      </p>
    `,
  },

  {
    side: 'engineering',
    title: 'TypeScript generics dễ hiểu',
    excerpt:
      'Generics trở nên dễ tiếp cận hơn khi nhìn chúng như cách giữ lại thông tin về kiểu dữ liệu.',
    tags: ['typescript'],
    cover: '/images/covers/typescript.jpg',
    content: `
      <h2>Đừng bắt đầu bằng cú pháp khó</h2>
      <p>
        Khi mới học generics, phần khó nhất thường không phải cú pháp mà là
        hiểu tại sao chúng ta cần giữ lại type information.
      </p>

      <pre><code>function first&lt;T&gt;(items: T[]): T {
  return items[0];
}</code></pre>

      <p>
        Ở đây T có thể đại diện cho nhiều kiểu khác nhau.
        Hàm vẫn giữ được mối quan hệ giữa input và output mà không cần sử dụng any.
      </p>

      <h3>Khi nào nên dùng?</h3>
      <ul>
        <li>Reusable utility functions</li>
        <li>Generic API responses</li>
        <li>Reusable components</li>
      </ul>
    `,
  },

  {
    side: 'life',
    title: 'Cách mình giữ thói quen viết mỗi ngày',
    excerpt:
      'Không đặt mục tiêu viết thật nhiều; chỉ cố gắng để ngày hôm nay có thêm một đoạn nhỏ.',
    tags: ['career'],
    cover: '/images/covers/writing.jpg',
    content: `
      <h2>Viết ít nhưng đều</h2>
      <p>
        Có một thời gian tôi nghĩ rằng muốn viết tốt thì mỗi lần ngồi xuống
        phải hoàn thành một bài thật dài.
      </p>

      <p>
        Sau đó tôi đổi cách tiếp cận. Mỗi ngày chỉ cần ghi lại một ý tưởng,
        một lỗi đã gặp hoặc một điều mình vừa hiểu.
      </p>

      <ol>
        <li>Ghi lại ý tưởng ngay khi nó xuất hiện.</li>
        <li>Không chỉnh sửa quá nhiều trong lần đầu.</li>
        <li>Cuối tuần xem lại và chọn những ý đáng phát triển.</li>
      </ol>

      <p>
        Sau vài tháng, những mẩu ghi chú nhỏ bắt đầu trở thành những bài viết hoàn chỉnh.
      </p>
    `,
  },

  {
    side: 'engineering',
    title: 'React state: từ useState đến reducer',
    excerpt:
      'Khi state bắt đầu có nhiều transition, reducer có thể giúp logic thay đổi trạng thái dễ theo dõi hơn.',
    tags: ['react', 'typescript'],
    cover: '/images/covers/react-state.jpg',
    content: `
      <h2>State không chỉ là dữ liệu</h2>
      <p>
        Trong component nhỏ, useState thường là lựa chọn tự nhiên.
        Nhưng khi một state có nhiều cách thay đổi khác nhau,
        logic có thể nhanh chóng bị phân tán.
      </p>

      <pre><code>type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' };</code></pre>

      <p>
        Reducer gom các transition về một nơi và làm cho các action trở nên rõ ràng hơn.
      </p>

      <h3>Điều quan trọng</h3>
      <p>
        Không nên chuyển mọi useState thành reducer chỉ vì reducer trông có vẻ
        chuyên nghiệp hơn. Hãy chọn công cụ phù hợp với mức độ phức tạp thực tế.
      </p>
    `,
  },

  {
    side: 'life',
    title: 'Setup góc làm việc tối giản',
    excerpt:
      'Một góc làm việc tốt không cần thật nhiều thiết bị; nó cần giảm được những thứ khiến mình mất tập trung.',
    tags: ['design', 'coffee'],
    cover: '/images/covers/workspace.jpg',
    content: `
      <h2>Ít thứ hơn, ít quyết định hơn</h2>
      <p>
        Tôi bắt đầu thay đổi góc làm việc bằng cách bỏ bớt những thứ không dùng đến.
        Sau đó mới nghĩ đến việc mua thêm thiết bị.
      </p>

      <p>
        Màn hình được đặt ngang tầm mắt, bàn phím nằm ở vị trí thoải mái
        và ánh sáng được ưu tiên hơn những món đồ trang trí.
      </p>

      <h3>Danh sách hiện tại</h3>
      <ul>
        <li>Một màn hình chính</li>
        <li>Bàn phím cơ</li>
        <li>Một chiếc đèn bàn</li>
        <li>Một cuốn sổ nhỏ</li>
        <li>Cà phê hoặc trà tùy buổi</li>
      </ul>

      <p>
        Mục tiêu cuối cùng không phải có một setup đẹp để chụp ảnh,
        mà là có thể ngồi xuống và bắt đầu làm việc ngay.
      </p>
    `,
  },

  {
    side: 'engineering',
    title: 'Transaction và UPSERT trong Postgres',
    excerpt:
      'Một số thao tác ghi dữ liệu cần được thực hiện nguyên tử để tránh trạng thái không nhất quán.',
    tags: ['postgres', 'nodejs'],
    cover: '/images/covers/transaction.jpg',
    content: `
      <h2>Khi một request cần nhiều bước</h2>
      <p>
        Hãy tưởng tượng một request vừa tạo record vừa cập nhật một bảng liên quan.
        Nếu bước thứ hai thất bại, dữ liệu có thể bị bỏ lại ở trạng thái dở dang.
      </p>

      <h3>Transaction</h3>
      <p>
        Transaction cho phép gom nhiều thao tác thành một đơn vị công việc.
        Nếu có lỗi, toàn bộ thay đổi có thể được rollback.
      </p>

      <h3>UPSERT</h3>
      <pre><code>
INSERT INTO reactions (post_id, type, count)
VALUES ($1, $2, 1)
ON CONFLICT (post_id, type)
DO UPDATE SET count = reactions.count + 1;
      </code></pre>

      <p>
        Đây là một pattern phù hợp cho những trường hợp dữ liệu có khóa duy nhất
        và request có thể đồng thời cập nhật cùng một record.
      </p>
    `,
  },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);

async function main() {
  const client = await pool.connect();

  try {
    if (reset) {
      await client.query(`
        TRUNCATE
          notes,
          reactions,
          post_tags,
          tags,
          posts
        RESTART IDENTITY CASCADE
      `);

      console.log('Reset: đã xoá sạch dữ liệu.');
    } else {
      const { rows } = await client.query(
        'SELECT COUNT(*)::int AS count FROM posts'
      );

      if (rows[0].count > 0) {
        console.log(
          'DB đã có posts, bỏ qua seed. Dùng npm run seed:reset để seed lại.'
        );
        return;
      }
    }

    await client.query('BEGIN');

    const tagId = new Map<string, number>();

    for (const name of TAGS) {
      const result = await client.query(
        `
        INSERT INTO tags (name)
        VALUES ($1)
        RETURNING id
        `,
        [name]
      );

      tagId.set(name, result.rows[0].id);
    }

    const postIds: number[] = [];

    for (let i = 0; i < POSTS.length; i++) {
      const post = POSTS[i];

      const date = isoDaysAgo(i * 4);

      const result = await client.query(
        `
        INSERT INTO posts (
          slug,
          title,
          excerpt,
          content,
          side,
          cover,
          date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
          slugify(post.title),
          post.title,
          post.excerpt,
          post.content.trim(),
          post.side,
          post.cover,
          date,
        ]
      );

      const postId: number = result.rows[0].id;

      postIds.push(postId);

      for (const tagName of post.tags) {
        const id = tagId.get(tagName);

        if (!id) {
          throw new Error(`Tag không tồn tại: ${tagName}`);
        }

        await client.query(
          `
          INSERT INTO post_tags (post_id, tag_id)
          VALUES ($1, $2)
          `,
          [postId, id]
        );
      }
    }

    const reactionMatrix = [
      [12, 4, 2, 7],
      [3, 1, 0, 2],
      [40, 25, 12, 30],
      [7, 14, 1, 4],
      [1, 2, 0, 1],
      [18, 5, 9, 11],
      [31, 20, 4, 17],
      [5, 3, 8, 2],
    ];

    for (let i = 0; i < postIds.length; i++) {
      for (let j = 0; j < REACTIONS.length; j++) {
        await client.query(
          `
          INSERT INTO reactions (
            post_id,
            type,
            count
          )
          VALUES ($1, $2, $3)
          `,
          [
            postIds[i],
            REACTIONS[j],
            reactionMatrix[i][j],
          ]
        );
      }
    }

    const notes = [
      {
        message:
          'Bài REST API khá dễ hiểu. Mình thích phần phân chia controller và service.',
        name: 'An',
        email: 'an@example.com',
        topic: 'feedback',
        postId: postIds[0],
        date: isoDaysAgo(1),
      },
      {
        message:
          'Nếu bảng reactions có nhiều request đồng thời thì nên xử lý increment như thế nào?',
        name: 'Minh',
        email: null,
        topic: 'question',
        postId: postIds[7],
        date: isoDaysAgo(2),
      },
      {
        message:
          'Mình cũng đang học PostgreSQL và phần index khá hữu ích.',
        name: 'Bình',
        email: 'binh@example.com',
        topic: 'feedback',
        postId: postIds[1],
        date: isoDaysAgo(3),
      },
      {
        message:
          'Mình muốn trao đổi về một bài viết cộng tác cho blog.',
        name: null,
        email: 'writer@example.com',
        topic: 'collab',
        postId: null,
        date: isoDaysAgo(4),
      },
      {
        message:
          'Blog có kế hoạch viết thêm về frontend architecture không?',
        name: 'Chi',
        email: null,
        topic: 'question',
        postId: postIds[5],
        date: isoDaysAgo(5),
      },
      {
        message:
          'Mình vừa ghé Đà Lạt và thấy bài viết về chuyến đi khá thú vị.',
        name: 'Lan',
        email: 'lan@example.com',
        topic: 'general',
        postId: postIds[2],
        date: isoDaysAgo(6),
      },
    ];

    for (const note of notes) {
      await client.query(
        `
        INSERT INTO notes (
          message,
          name,
          email,
          topic,
          post_id,
          date
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          note.message,
          note.name,
          note.email,
          note.topic,
          note.postId,
          note.date,
        ]
      );
    }

    await client.query('COMMIT');

    console.log('');
    console.log('Seed thành công.');
    console.log(`Posts: ${POSTS.length}`);
    console.log(`Tags: ${TAGS.length}`);
    console.log(`Reactions: ${POSTS.length * REACTIONS.length}`);
    console.log(`Notes: ${notes.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
