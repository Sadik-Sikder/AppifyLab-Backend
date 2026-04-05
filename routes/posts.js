import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { auth } from "../middleware/auth.js";
import uploadPostImage from "../middleware/uploadPostImage.js";

const router = express.Router();

//post endpoints
router.post("/", auth,  uploadPostImage.single("image"), async (req, res) => {
  try {
    const { text, privacy } = req.body;
    const image = req.file?.path || null;

    if (!text && !image) {
      return res.status(400).json({ message: "Post must have text or image" });
    }

    const post = await Post.create({
      author: req.userId,
      text,
      image,
      privacy
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { privacy: "public" },
        { author: req.userId }
      ]
    };
    

    const posts = await Post.find(query)
      .populate("author", "firstName lastName profileImage")
      .populate("likes", "firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedPosts = await Promise.all(
      posts.map(async (post) => {
        const commentsCount = await Comment.countDocuments({
          post: post._id,
          parentComment: null
        });

        return {
          ...post.toObject(),
          likesCount: post.likes.length,
          commentsCount,
          isLiked: post.likes.some(user => user._id.equals(req.userId))
        };
      })
    );

    const total = await Post.countDocuments(query);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      posts: formattedPosts
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:postId/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isLiked = post.likes.includes(req.userId);

    if (isLiked) {
      post.likes.pull(req.userId);
    } else {
      post.likes.push(req.userId);
    }

    await post.save();

    res.json({
      likesCount: post.likes.length,
      isLiked: !isLiked
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Endpoints for comment
router.get("/:postId/comments", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5; 
    const skip = (page - 1) * limit;

    const query = {
      post: req.params.postId,
      parentComment: null
    };

    const comments = await Comment.find(query)
      .populate("author", "firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedComments = await Promise.all(
      comments.map(async (comment) => {
        const repliesCount = await Comment.countDocuments({ parentComment: comment._id });
        return {
          ...comment.toObject(),
          likesCount: comment.likes.length,
          repliesCount,
          isLiked: comment.likes.includes(req.userId)
        };
      })
    );

    const total = await Comment.countDocuments(query);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      comments: formattedComments
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post("/:postId/comment", auth, async (req, res) => {
  try {
    const { text, parentComment } = req.body;

    if (!text) return res.status(400).json({ message: "Comment text is required" });

    const comment = await Comment.create({
      post: req.params.postId,
      author: req.userId,
      text,
      parentComment: parentComment || null
    });

    await comment.populate("author", "firstName lastName profileImage");

    res.json({
      ...comment.toObject(),
      likesCount: 0,
      repliesCount: 0,
      isLiked: false
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/comment/:commentId/replies", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = { parentComment: req.params.commentId };

    const replies = await Comment.find(query)
      .populate("author", "firstName lastName profileImage")
      .sort({ createdAt: 1 }) 
      .skip(skip)
      .limit(limit);

    const formattedReplies = replies.map(reply => ({
      ...reply.toObject(),
      likesCount: reply.likes.length,
      isLiked: reply.likes.includes(req.userId)
    }));

    const total = await Comment.countDocuments(query);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      replies: formattedReplies
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post("/comment/:commentId/reply", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const parentCommentId = req.params.commentId;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      return res.status(404).json({ message: "Parent comment not found" });
    }

    const reply = new Comment({
      post: parentComment.post, 
      author: req.userId,
      text,
      parentComment: parentCommentId,
      likes: [],
    });

    await reply.save();

    const populatedReply = await reply.populate("author", "firstName lastName profileImage").execPopulate();

    res.status(201).json({
      id: populatedReply._id,
      post: populatedReply.post,
      user: {
        id: populatedReply.author._id,
        name: `${populatedReply.author.firstName} ${populatedReply.author.lastName}`,
        avatar: populatedReply.author.profileImage || "",
      },
      text: populatedReply.text,
      likes: populatedReply.likes,
      likesCount: populatedReply.likes.length,
      parentComment: populatedReply.parentComment,
      isLiked: false,
      createdAt: populatedReply.createdAt,
      repliesCount: 0, 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/comments/:commentId/like", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isLiked = comment.likes.includes(req.userId);

    if (isLiked) comment.likes.pull(req.userId);
    else comment.likes.push(req.userId);

    await comment.save();

    res.json({
      likesCount: comment.likes.length,
      isLiked: !isLiked
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;