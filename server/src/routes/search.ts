import { Router } from 'express';
import { EventModel, ProposalModel, RecommendationModel } from '../models/index.js';

const searchRouter = Router();

searchRouter.get('/events', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
      ];
    }
    if (tag) {
      filter.tag = tag;
    }

    const items = await EventModel.find(filter).sort({ startsAt: 1 }).limit(100).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

searchRouter.get('/proposals', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (status) {
      filter.status = status;
    }

    const items = await ProposalModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

searchRouter.get('/recommendations', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const filter: Record<string, unknown> = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) {
      filter.category = category;
    }

    const items = await RecommendationModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

export { searchRouter };
