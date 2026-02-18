import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    roomId: { type: Types.ObjectId, ref: 'Room', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

messageSchema.index({ roomId: 1, createdAt: -1 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: string;
  createdAt: Date;
};

export const MessageModel = model('Message', messageSchema);
