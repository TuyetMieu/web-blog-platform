import { AppError } from '../utils/errors';
import { loadSiteContent } from '../utils/site-content';

export const aboutService = {
  // Đọc lại mỗi request để sửa data/site-content.js là thấy ngay, không cần restart.
  async get(): Promise<unknown> {
    try {
      return loadSiteContent().about;
    } catch (err) {
      console.error(err);
      throw new AppError(500, 'Cannot read about data');
    }
  },
};
