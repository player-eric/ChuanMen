import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { UserModel } from '../models/User.js';

const usersRouter = Router();

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  avatar: z.string().url().optional().default(''),
  bio: z.string().optional().default(''),
  role: z.string().optional().default('member'),
});

const updateUserSchema = createUserSchema.partial();

usersRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const [items, total] = await Promise.all([
      UserModel.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments({}),
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
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);

    const existedUser = await UserModel.findOne({ email: payload.email }).lean();
    if (existedUser) {
      res.status(409).json({ message: '邮箱已被注册' });
      return;
    }

    const user = await UserModel.create(payload);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({ message: '无效的用户标识' });
      return;
    }

    const user = await UserModel.findById(userId).lean();
    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({ message: '无效的用户标识' });
      return;
    }

    const payload = updateUserSchema.parse(req.body);

    const user = await UserModel.findByIdAndUpdate(userId, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.delete('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({ message: '无效的用户标识' });
      return;
    }

    const user = await UserModel.findByIdAndDelete(userId).lean();
    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }

    res.json({ deleted: true, user });
  } catch (error) {
    next(error);
  }
});

export { usersRouter };
