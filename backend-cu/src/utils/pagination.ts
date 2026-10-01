export const offsetOf = (page: number, perPage: number): number => (page - 1) * perPage;

export const totalPages = (total: number, perPage: number): number =>
  Math.max(1, Math.ceil(total / perPage));

export const escapeLike = (s: string): string => s.replace(/[\\%_]/g, (m) => `\\${m}`);
