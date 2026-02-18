import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../src/db';
import { resetSocketState } from '../src/socket/index';

process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDb(mongoServer.getUri());
});

afterEach(async () => {
  const collections = await mongoose.connection.db?.collections();
  if (collections) {
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  }
  resetSocketState();
});

afterAll(async () => {
  await disconnectDb();
  await mongoServer.stop();
});
