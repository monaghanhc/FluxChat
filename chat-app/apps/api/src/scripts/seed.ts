import bcrypt from 'bcryptjs';
import { config } from '../config';
import { connectDb, disconnectDb } from '../db';
import { UserModel } from '../models/User';
import { RoomModel } from '../models/Room';
import { MembershipModel } from '../models/Membership';

const seed = async () => {
  await connectDb(config.mongoUri);

  const demoEmail = 'demo@fluxchat.local';
  const demoPassword = 'password123';
  const demoDisplayName = 'Demo User';

  let user = await UserModel.findOne({ email: demoEmail });
  if (!user) {
    user = await UserModel.create({
      email: demoEmail,
      displayName: demoDisplayName,
      passwordHash: await bcrypt.hash(demoPassword, 12),
    });
  }

  const roomNames = ['general', 'engineering', 'random'];

  for (const roomName of roomNames) {
    let room = await RoomModel.findOne({ name: roomName });
    if (!room) {
      room = await RoomModel.create({ name: roomName, isPublic: true });
    }

    await MembershipModel.findOneAndUpdate(
      { userId: user._id, roomId: room._id },
      {
        $setOnInsert: {
          userId: user._id,
          roomId: room._id,
          lastReadAt: new Date(0),
        },
      },
      { upsert: true },
    );
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete');
  // eslint-disable-next-line no-console
  console.log(`Demo user: ${demoEmail} / ${demoPassword}`);

  await disconnectDb();
};

seed().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed', error);
  await disconnectDb();
  process.exit(1);
});
