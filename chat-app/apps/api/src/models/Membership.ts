import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const membershipSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: Types.ObjectId, ref: 'Room', required: true, index: true },
    lastReadAt: { type: Date, required: true, default: () => new Date(0) },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

membershipSchema.index({ userId: 1, roomId: 1 }, { unique: true });

export type MembershipDocument = InferSchemaType<typeof membershipSchema> & {
  _id: string;
  createdAt: Date;
};

export const MembershipModel = model('Membership', membershipSchema);
