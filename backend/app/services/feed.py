"""RSS 2.0 cho link "RSS Feed" ở header/footer."""
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.parse import quote
from xml.sax.saxutils import escape

from ..config import RSS_ITEMS
from ..db import get_db
from ..repositories import posts as repo

_XML_ENTITIES = {'"': "&quot;", "'": "&apos;"}
SIDE_LABEL = {"engineering": "Side A: Craft & Systems", "life": "Side B: Soul & Everyday"}


def _xml(text: str | None) -> str:
    return escape(text or "", _XML_ENTITIES)


def _cdata(text: str) -> str:
    return "<![CDATA[" + text.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def rss(site_url: str) -> str:
    base = site_url.rstrip("/")
    items = []
    for p in repo.find_recent(get_db(), RSS_ITEMS, with_content=True):
        link = f"{base}/article.html?slug={quote(p['slug'])}"
        published = datetime.fromisoformat(f"{p['date']}T07:00:00+07:00")
        lines = [
            "    <item>",
            f"      <title>{_xml(p['title'])}</title>",
            f"      <link>{_xml(link)}</link>",
            f'      <guid isPermaLink="true">{_xml(link)}</guid>',
            f"      <pubDate>{format_datetime(published.astimezone(timezone.utc), usegmt=True)}</pubDate>",
            f"      <category>{_xml(SIDE_LABEL.get(p['side'], p['side']))}</category>",
        ]
        if p["category"]:
            lines.append(f"      <category>{_xml(p['category'])}</category>")
        lines += [
            f"      <description>{_xml(p['excerpt'])}</description>",
            f"      <content:encoded>{_cdata(p['content'])}</content:encoded>",
            "    </item>",
        ]
        items.append("\n".join(lines))

    return "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">',
            "  <channel>",
            "    <title>Kiên's Journal</title>",
            f"    <link>{_xml(base)}/</link>",
            f'    <atom:link href="{_xml(base)}/api/rss" rel="self" type="application/rss+xml"/>',
            "    <description>Slow essays on distributed systems, Hanoi mornings, tea and old books.</description>",
            "    <language>vi</language>",
            *items,
            "  </channel>",
            "</rss>",
        ]
    )
