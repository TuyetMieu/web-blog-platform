export type ReactionsDTO = Record<string, number>;

export type PostListItemDTO = {
  slug: string;
  title: string;
  excerpt: string | null;
  side: string;
  tags: string[];
  cover: string | null;
  date: string;
  reactions: ReactionsDTO;
};

export type PostListDTO = {
  total_pages: number;
  page: number;
  posts: PostListItemDTO[];
};

export type PostNavDTO = { slug: string; title: string } | null;

export type PostDetailDTO = {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  date: string;
  cover: string | null;
  reactions: ReactionsDTO;
  prev: PostNavDTO;
  next: PostNavDTO;
};
