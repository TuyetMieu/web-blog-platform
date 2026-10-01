export const emptyToUndef = (v: unknown): unknown =>
  v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v;
