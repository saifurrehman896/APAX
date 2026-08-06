import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * MetalEntry — amount held in grams for a single metal type.
 */
export interface IMetalEntry {
  amountGrams: number;
  updatedAt: Date;
}

/**
 * Holding — a user's precious-metal portfolio snapshot.
 * One document per user; upserted when vault events occur.
 */
export interface IHolding extends Document {
  userId: Types.ObjectId;
  gold: IMetalEntry;
  silver: IMetalEntry;
  platinum: IMetalEntry;
  createdAt: Date;
  updatedAt: Date;
}

const metalEntrySchema = new Schema<IMetalEntry>(
  {
    amountGrams: { type: Number, required: true, default: 0, min: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const holdingSchema = new Schema<IHolding>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    gold: { type: metalEntrySchema, default: () => ({ amountGrams: 0 }) },
    silver: { type: metalEntrySchema, default: () => ({ amountGrams: 0 }) },
    platinum: { type: metalEntrySchema, default: () => ({ amountGrams: 0 }) },
  },
  {
    timestamps: true,
  }
);

const Holding: Model<IHolding> = mongoose.model<IHolding>(
  "Holding",
  holdingSchema
);

export default Holding;
