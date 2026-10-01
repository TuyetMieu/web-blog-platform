export type ReactionsDTO = Record<string, number>;

export type PostListItemDTO = {
  slug: string;
  title: string;
  excerpt: string | null;
  side: string;
  category: string | null;
  tags: string[];
  cover: string | null;
  date: string;
  featured: boolean;
  reads: number;
  read_minutes: number;
  note_count: number;
  reactions: ReactionsDTO;
  extra: Record<string, unknown>;
};

export type PostListDTO = {
  total: number;
  total_pages: number;
  page: number;
  per_page: number;
  posts: PostListItemDTO[];
};

export type PostNavDTO = { slug: string; title: string; side: string; read_minutes: number } | null;

export type PostDetailDTO = PostListItemDTO & {
  content: string;
  /** Bài mới hơn */
  prev: PostNavDTO;
  /** Bài cũ hơn */
  next: PostNavDTO;
};

export type CategoryDTO = { side: string; name: string; count: number };
