import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

type CrudOptions = {
  defaultSortBy?: string;
  maxLimit?: number;
};

type MongooseModel = mongoose.Model<any>;

const RESERVED_QUERY_KEYS = new Set(['page', 'limit', 'sortBy', 'sortOrder']);

function buildFilter(query: Request['query']): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    if (RESERVED_QUERY_KEYS.has(key) || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      filter[key] = { $in: value };
      continue;
    }

    if (value === 'true') {
      filter[key] = true;
      continue;
    }

    if (value === 'false') {
      filter[key] = false;
      continue;
    }

    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
      filter[key] = Number(value);
      continue;
    }

    filter[key] = value;
  }

  return filter;
}

export function createCrudController(model: MongooseModel, options?: CrudOptions) {
  const defaultSortBy = options?.defaultSortBy ?? 'createdAt';
  const maxLimit = options?.maxLimit ?? 100;

  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit ?? 20)));
        const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : defaultSortBy;
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const filter = buildFilter(req.query);
        const [items, total] = await Promise.all([
          model
            .find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
          model.countDocuments(filter),
        ]);

        res.json({
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
        });
      } catch (error) {
        next(error);
      }
    },

    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const item = await model.create(req.body);
        res.status(201).json(item);
      } catch (error) {
        next(error);
      }
    },

    getById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
          res.status(400).json({ message: '无效的资源标识' });
          return;
        }

        const item = await model.findById(id).lean();
        if (!item) {
          res.status(404).json({ message: '资源不存在' });
          return;
        }

        res.json(item);
      } catch (error) {
        next(error);
      }
    },

    updateById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
          res.status(400).json({ message: '无效的资源标识' });
          return;
        }

        const item = await model
          .findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
          })
          .lean();

        if (!item) {
          res.status(404).json({ message: '资源不存在' });
          return;
        }

        res.json(item);
      } catch (error) {
        next(error);
      }
    },

    deleteById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
          res.status(400).json({ message: '无效的资源标识' });
          return;
        }

        const item = await model.findByIdAndDelete(id).lean();
        if (!item) {
          res.status(404).json({ message: '资源不存在' });
          return;
        }

        res.json({ deleted: true, item });
      } catch (error) {
        next(error);
      }
    },
  };
}
