import { Router } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/User.js';

const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email: payload.email.toLowerCase() }).lean();
    if (!user) {
      res.status(404).json({ message: '用户不存在，请先注册' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export { authRouter };
