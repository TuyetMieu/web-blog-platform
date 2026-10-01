import { RSS_ITEMS } from '../config/constants';
import { postRepository } from '../repositories/post.repository';

const xml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const cdata = (s: string): string => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

export const feedService = {
  /** RSS 2.0 cho footer "RSS Feed". siteUrl: gốc site, vd. http://localhost:3000 */
  async rss(siteUrl: string): Promise<string> {
    const posts = await postRepository.findRecentWithContent(RSS_ITEMS);
    const base = siteUrl.replace(/\/+$/, '');
    const items = posts
      .map((p) => {
        const link = `${base}/article.html?slug=${encodeURIComponent(p.slug)}`;
        const side = p.side === 'engineering' ? 'Side A: Craft & Systems' : 'Side B: Soul & Everyday';
        return [
          '    <item>',
          `      <title>${xml(p.title)}</title>`,
          `      <link>${xml(link)}</link>`,
          `      <guid isPermaLink="true">${xml(link)}</guid>`,
          `      <pubDate>${new Date(`${p.date}T07:00:00+07:00`).toUTCString()}</pubDate>`,
          `      <category>${xml(side)}</category>`,
          p.category ? `      <category>${xml(p.category)}</category>` : '',
          `      <description>${xml(p.excerpt ?? '')}</description>`,
          `      <content:encoded>${cdata(p.content)}</content:encoded>`,
          '    </item>',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">',
      '  <channel>',
      "    <title>Kiên's Journal</title>",
      `    <link>${xml(base)}/</link>`,
      `    <atom:link href="${xml(base)}/api/rss" rel="self" type="application/rss+xml"/>`,
      '    <description>Slow essays on distributed systems, Hanoi mornings, tea and old books.</description>',
      '    <language>vi</language>',
      items,
      '  </channel>',
      '</rss>',
    ].join('\n');
  },
};
