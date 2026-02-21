import { Router } from 'express';
import { healthRouter } from './health.js';
import { mediaRouter } from './media.js';
import { usersRouter } from './users.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/media', mediaRouter);

export { apiRouter };
