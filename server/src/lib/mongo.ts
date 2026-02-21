import mongoose from 'mongoose';
import { env } from '../config/env.js';

let isConnected = false;

export async function connectMongo(): Promise<void> {
  if (isConnected) {
    return;
  }

  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10000,
  });

  isConnected = true;
  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });
}
