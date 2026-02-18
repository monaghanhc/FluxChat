import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createHttpServer } from './app';
import { config } from './config';
import { connectDb, disconnectDb } from './db';
import { createSocketServer } from './socket/index';

let inMemoryMongo: MongoMemoryServer | null = null;

const connectDatabase = async (): Promise<void> => {
  if (process.env.USE_IN_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memoryServer = await MongoMemoryServer.create();
    inMemoryMongo = memoryServer;
    await connectDb(memoryServer.getUri());
    return;
  }

  await connectDb(config.mongoUri);
};

const start = async (): Promise<void> => {
  await connectDatabase();

  const { server } = createHttpServer();
  createSocketServer(server);

  const shutdown = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDb();
    if (inMemoryMongo) {
      await inMemoryMongo.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  server.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${config.port}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API', error);
  process.exit(1);
});
