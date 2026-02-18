import { Schema, model, type InferSchemaType } from 'mongoose';

const roomSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isPublic: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export type RoomDocument = InferSchemaType<typeof roomSchema> & {
  _id: string;
  createdAt: Date;
};

export const RoomModel = model('Room', roomSchema);
