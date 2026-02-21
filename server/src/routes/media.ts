import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import express, { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { buildS3ObjectUrl, createDownloadUrl, createUploadUrl, s3Client } from '../lib/s3.js';
import { MediaAssetModel } from '../models/MediaAsset.js';

const mediaRouter = Router();

const presignSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  ownerId: z.string().optional(),
});

const completeUploadSchema = z.object({
  key: z.string().min(1),
  fileSize: z.number().int().nonnegative().optional().default(0),
});

mediaRouter.post('/presign', async (req, res, next) => {
  try {
    const payload = presignSchema.parse(req.body);

    if (payload.ownerId && !mongoose.isValidObjectId(payload.ownerId)) {
      res.status(400).json({ message: 'Invalid ownerId' });
      return;
    }

    const ext = payload.fileName.includes('.')
      ? payload.fileName.split('.').pop()?.toLowerCase() ?? 'bin'
      : 'bin';

    const key = `media/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const uploadUrl = await createUploadUrl({ key, contentType: payload.contentType });
    const publicUrl = buildS3ObjectUrl(key);

    await MediaAssetModel.create({
      key,
      ownerId: payload.ownerId ?? null,
      contentType: payload.contentType,
      url: publicUrl,
      status: 'pending',
    });

    res.status(201).json({
      key,
      uploadUrl,
      publicUrl,
      expiresInSec: env.S3_PRESIGN_EXPIRES_SECONDS,
      method: 'PUT',
      requiredHeaders: {
        'Content-Type': payload.contentType,
      },
    });
  } catch (error) {
    next(error);
  }
});

mediaRouter.post('/complete', async (req, res, next) => {
  try {
    const payload = completeUploadSchema.parse(req.body);

    const media = await MediaAssetModel.findOneAndUpdate(
      { key: payload.key },
      { status: 'uploaded', fileSize: payload.fileSize },
      { new: true },
    ).lean();

    if (!media) {
      res.status(404).json({ message: 'Media key not found' });
      return;
    }

    res.json(media);
  } catch (error) {
    next(error);
  }
});

mediaRouter.get('/download-url', async (req, res, next) => {
  try {
    const key = req.query.key;
    if (typeof key !== 'string' || !key) {
      res.status(400).json({ message: 'Missing key' });
      return;
    }

    const downloadUrl = await createDownloadUrl(key);
    res.json({ key, downloadUrl });
  } catch (error) {
    next(error);
  }
});

mediaRouter.post('/upload-proxy', express.raw({ type: '*/*', limit: '20mb' }), async (req, res, next) => {
  try {
    const fileName = typeof req.query.fileName === 'string' ? req.query.fileName : '';
    const contentType =
      typeof req.query.contentType === 'string' && req.query.contentType
        ? req.query.contentType
        : 'application/octet-stream';
    const ownerId = typeof req.query.ownerId === 'string' ? req.query.ownerId : '';

    if (!fileName) {
      res.status(400).json({ message: 'Missing fileName query parameter' });
      return;
    }

    if (ownerId && !mongoose.isValidObjectId(ownerId)) {
      res.status(400).json({ message: 'Invalid ownerId' });
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ message: 'Empty file body' });
      return;
    }

    const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? 'bin' : 'bin';
    const key = `media/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: req.body,
        ContentType: contentType,
      }),
    );

    const publicUrl = buildS3ObjectUrl(key);
    const media = await MediaAssetModel.create({
      key,
      ownerId: ownerId || null,
      contentType,
      fileSize: req.body.length,
      url: publicUrl,
      status: 'uploaded',
    });

    res.status(201).json(media);
  } catch (error) {
    next(error);
  }
});

export { mediaRouter };
