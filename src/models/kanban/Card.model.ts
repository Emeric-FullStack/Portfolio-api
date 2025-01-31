import { model, Schema } from "mongoose";
import { IComment } from "./Comment.model";

interface ICard extends Document {
    title: string;
    description?: string;
    list: Schema.Types.ObjectId;
    board: Schema.Types.ObjectId;
    position: number;
    dueDate?: Date;
    assignedTo?: Schema.Types.ObjectId[];
    labels?: string[];
    comments?: IComment[];
    createdAt: Date;
    updatedAt: Date;
}

const CardSchema = new Schema<ICard>(
    {
        title: { type: String, required: true },
        description: { type: String },
        list: { type: Schema.Types.ObjectId, ref: "List", required: true },
        board: { type: Schema.Types.ObjectId, ref: "Board", required: true },
        position: { type: Number, required: true }, // Position dans la liste
        dueDate: { type: Date },
        assignedTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
        labels: [{ type: String }], // Étiquettes de la carte
        comments: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User" },
                text: { type: String },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

export const Card = model<ICard>("Card", CardSchema);