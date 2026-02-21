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

usersRouter.post('/', async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);

    const existedUser = await UserModel.findOne({ email: payload.email }).lean();
    if (existedUser) {
      res.status(409).json({ message: 'Email already registered' });
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
      res.status(400).json({ message: 'Invalid user id' });
      return;
    }

    const user = await UserModel.findById(userId).lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
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
      res.status(400).json({ message: 'Invalid user id' });
      return;
    }

    const payload = updateUserSchema.parse(req.body);

    const user = await UserModel.findByIdAndUpdate(userId, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export { usersRouter };
