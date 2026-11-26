import mongoose, { Schema } from "mongoose";

const videoAssetSchema = new Schema(
  {
    videoId: { type: String, required: true, unique: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

export default mongoose.model("VideoAsset", videoAssetSchema);
