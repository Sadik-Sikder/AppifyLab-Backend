import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const auth = (req, res, next) => {
  
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};