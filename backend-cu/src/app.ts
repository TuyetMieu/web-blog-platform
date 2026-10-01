import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import aboutRoutes from './routes/about.routes';
import feedRoutes from './routes/feed.routes';
import noteRoutes from './routes/note.routes';
import postRoutes from './routes/post.routes';
import reactionRoutes from './routes/reaction.routes';

export const app = express();

app.set('trust proxy', 'loopback');
app.use('/api', cors({ origin: env.corsOrigins, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/posts', postRoutes);
app.use('/api/posts', reactionRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/rss', feedRoutes);
app.use('/api', notFoundMiddleware);

// Phục vụ frontend tĩnh (../frontend: index.html, journal.html, ...) cùng origin với API.
if (env.frontendDir) {
  const frontendDir = env.frontendDir;
  app.use(express.static(frontendDir, { extensions: ['html'], dotfiles: 'ignore', index: 'index.html' }));
  app.use((req, res) => {
    if (req.accepts('html')) res.status(404).sendFile(path.join(frontendDir, '404.html'));
    else res.status(404).json({ error: 'Not found' });
  });
}

app.use(notFoundMiddleware);
app.use(errorMiddleware);
