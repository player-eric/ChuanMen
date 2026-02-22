import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    message: `路由不存在：${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: '请求参数不合法',
      issues: error.issues,
    });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: '未知服务器错误' });
}
