import express from "express";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/upload-profile", auth, upload.single("image"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = req.file.path; 

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: imageUrl },
      { new: true, select: "-password" } 
    );

    res.json({ message: "Profile updated", profileImage: user.profileImage });
  } catch (err) {
    res.status(500).json({ message: err.message || "Upload failed" });
  }
});

export default router;