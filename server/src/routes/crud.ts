import { Router } from 'express';
import mongoose from 'mongoose';
import { createCrudController } from '../controllers/crud.js';

type CrudRouterOptions = {
  defaultSortBy?: string;
  maxLimit?: number;
};

export function createCrudRouter(
  model: mongoose.Model<any>,
  options?: CrudRouterOptions,
): Router {
  const router = Router();
  const controller = createCrudController(model, options);

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.updateById);
  router.delete('/:id', controller.deleteById);

  return router;
}
