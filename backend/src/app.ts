import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import aboutRoutes from './routes/about.routes';
import noteRoutes from './routes/note.routes';
import postRoutes from './routes/post.routes';
import reactionRoutes from './routes/reaction.routes';

export const app = express();

app.use(cors({ origin: env.corsOrigins, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/posts', postRoutes);
app.use('/api/posts', reactionRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/about', aboutRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);