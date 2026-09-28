import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError } from '../utils/errors';

const ABOUT_FILE = path.resolve(process.cwd(), 'data/about.json');

export const aboutService = {
  async get(): Promise<unknown> {
    try {
      return JSON.parse(await fs.readFile(ABOUT_FILE, 'utf8'));
    } catch {
      throw new AppError(500, 'Cannot read about data');
    }
  },
};
