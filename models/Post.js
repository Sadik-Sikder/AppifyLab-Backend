import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true
  },

  text: {
    type: String,
    trim: true
  },

  image: String,

  likes: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],

  privacy: { 
    type: String, 
    enum: ["public", "private"], 
    default: "public" 
  },

}, { timestamps: true });


postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ privacy: 1 });

export default mongoose.model("Post", postSchema);