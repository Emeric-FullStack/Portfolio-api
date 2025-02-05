import { Schema, model } from "mongoose";

export interface IComment extends Document {
    user: Schema.Types.ObjectId;
    card: Schema.Types.ObjectId;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        card: { type: Schema.Types.ObjectId, ref: "Card", required: true },
        text: { type: String, required: true },
    },
    { timestamps: true }
);

export const Comment = model<IComment>("Comment", CommentSchema);