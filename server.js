import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import uploadRoutes from "./routes/user.js";

dotenv.config();
const app = express();

app.use(cors({
  origin: "http://localhost:3000", 
  credentials: true,                
}));
app.use(express.json());
app.use(cookieParser());


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));



app.use("/api", uploadRoutes); 

app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));