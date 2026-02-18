import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from '../config';

const run = async (): Promise<void> => {
  const client = new MongoClient(config.mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    // eslint-disable-next-line no-console
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    await client.close();
  }
};

run().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('MongoDB ping failed', error);
  process.exit(1);
});
