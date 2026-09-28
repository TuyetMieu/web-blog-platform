import { Pool, types } from 'pg';
import { env } from './env';

types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1082, (v) => v);

export const pool = new Pool({ connectionString: env.databaseUrl });

export type Db = Pick<Pool, 'query'>;
