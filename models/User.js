import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  profileImage: {
    type: String,
    default: ""
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);