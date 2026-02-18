import bcrypt from 'bcryptjs';
import { UserModel } from '../../src/models/User';
import { RoomModel } from '../../src/models/Room';
import { MembershipModel } from '../../src/models/Membership';
import { signJwt } from '../../src/lib/jwt';

export const createUser = async (overrides?: Partial<{ email: string; password: string; displayName: string }>) => {
  const email = overrides?.email ?? 'user@example.com';
  const password = overrides?.password ?? 'password123';
  const displayName = overrides?.displayName ?? 'Demo User';

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ email, passwordHash, displayName });

  return {
    user,
    token: signJwt({ userId: user._id.toString(), email: user.email }),
    password,
  };
};

export const createRoomAndMembership = async (userId: string, roomName = 'general') => {
  const room = await RoomModel.create({ name: roomName, isPublic: true });
  await MembershipModel.create({ userId, roomId: room._id, lastReadAt: new Date(0) });
  return room;
};
