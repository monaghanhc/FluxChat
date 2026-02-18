import mongoose from 'mongoose';

export const connectDb = async (mongoUri: string): Promise<void> => {
  await mongoose.connect(mongoUri);
};

export const disconnectDb = async (): Promise<void> => {
  await mongoose.disconnect();
};
