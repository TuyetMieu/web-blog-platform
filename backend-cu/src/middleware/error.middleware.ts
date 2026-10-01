import { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';

export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    status = err.status;
    message = err.message;
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Payload too large';
  } else {
    console.error(err);
  }

  const path = req.originalUrl.split('?')[0].replace(/\/+$/, '');
  if (req.method === 'POST' && path === '/api/notes') {
    res.status(status).json({ ok: false, error: message });
    return;
  }
  res.status(status).json({ error: message });
};
