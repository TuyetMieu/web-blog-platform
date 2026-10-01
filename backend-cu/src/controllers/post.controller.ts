import { DEFAULT_RECENT_LIMIT, DEFAULT_TOP_LIMIT, POSTS_PER_PAGE } from '../config/constants';
import { limitQuerySchema, listPostsQuerySchema, slugParamSchema } from '../schemas/post.schema';
import { postService } from '../services/post.service';
import { asyncHandler } from '../utils/async-handler';
import { parse } from '../utils/validate';

const listQuery = listPostsQuerySchema(POSTS_PER_PAGE);

export const postController = {
  list: asyncHandler(async (req, res) => {
    res.json(await postService.getPosts(parse(listQuery, req.query)));
  }),
  top: asyncHandler(async (req, res) => {
    const { limit } = parse(limitQuerySchema(DEFAULT_TOP_LIMIT), req.query);
    res.json(await postService.getTopPosts(limit));
  }),
  recent: asyncHandler(async (req, res) => {
    const { limit } = parse(limitQuerySchema(DEFAULT_RECENT_LIMIT), req.query);
    res.json(await postService.getRecentPosts(limit));
  }),
  categories: asyncHandler(async (_req, res) => {
    res.json(await postService.getCategories());
  }),
  detail: asyncHandler(async (req, res) => {
    const { slug } = parse(slugParamSchema, req.params);
    res.json(await postService.getPostBySlug(slug));
  }),
  read: asyncHandler(async (req, res) => {
    const { slug } = parse(slugParamSchema, req.params);
    res.json(await postService.markRead(slug));
  }),
};
