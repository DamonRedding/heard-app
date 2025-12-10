import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertCommentSchema, insertEmailSubscriberSchema, type Category, type VoteType, type FlagReason, type Status, type ReactionType, type CommentVoteType } from "@shared/schema";
import { sortByWilsonScore } from "@shared/wilson-score";
import { z } from "zod";
import { createHash } from "crypto";
import { sendWelcomeEmail } from "./email";

const VALID_REACTIONS: ReactionType[] = ["heart", "care", "haha", "wow", "sad", "angry"];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "sanctuary2024";

const RATE_LIMITS = {
  submissions: { max: 5, windowMs: 24 * 60 * 60 * 1000 },
  votes: { max: 50, windowMs: 24 * 60 * 60 * 1000 },
};

const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

function hashIP(ip: string): string {
  return createHash("sha256").update(ip + "sanctuary-salt").digest("hex").slice(0, 32);
}

function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function checkRateLimit(ip: string, action: "submissions" | "votes"): { allowed: boolean; remaining: number } {
  const key = `${action}:${ip}`;
  const limit = RATE_LIMITS[action];
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now >= record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { allowed: true, remaining: limit.max - 1 };
  }

  if (record.count >= limit.max) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit.max - record.count };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/submissions", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as Category | undefined;
      const search = req.query.search as string | undefined;
      const denomination = req.query.denomination as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as "hot" | "new") || "hot";

      const result = await storage.getSubmissions({
        category,
        search,
        denomination,
        page,
        limit,
        sort,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/submissions/related", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as Category | undefined;
      const denomination = req.query.denomination as string | undefined;
      const excludeId = req.query.excludeId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 5;

      const relatedPosts = await storage.getRelatedPosts({
        category,
        denomination,
        excludeId,
        limit,
      });

      res.json({ submissions: relatedPosts });
    } catch (error) {
      console.error("Error fetching related posts:", error);
      res.status(500).json({ error: "Failed to fetch related posts" });
    }
  });

  app.get("/api/submissions/:id", async (req: Request, res: Response) => {
    try {
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  app.post("/api/submissions", async (req: Request, res: Response) => {
    try {
      const clientIP = getClientIP(req);
      const { allowed, remaining } = checkRateLimit(clientIP, "submissions");

      if (!allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded. You can submit up to 5 experiences per day.",
        });
      }

      const parsed = insertSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid submission data",
          details: parsed.error.errors,
        });
      }

      const submission = await storage.createSubmission(parsed.data);

      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  app.post("/api/submissions/:id/vote", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { voteType } = req.body as { voteType: VoteType };

      if (!["condemn", "absolve"].includes(voteType)) {
        return res.status(400).json({ error: "Invalid vote type" });
      }

      const clientIP = getClientIP(req);
      const voterHash = hashIP(clientIP);

      const { allowed } = checkRateLimit(clientIP, "votes");
      if (!allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded. You can cast up to 50 votes per day.",
        });
      }

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const existingVote = await storage.getVote(id, voterHash);
      let action: "added" | "removed" | "changed" = "added";

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          await storage.deleteVote(id, voterHash);
          action = "removed";
        } else {
          await storage.deleteVote(id, voterHash);
          await storage.createVote({
            submissionId: id,
            voteType,
            voterHash,
          });
          action = "changed";
        }
      } else {
        await storage.createVote({
          submissionId: id,
          voteType,
          voterHash,
        });
        action = "added";
      }

      await storage.updateVoteCounts(id);

      const updated = await storage.getSubmission(id);
      res.json({ ...updated, action, currentVote: action === "removed" ? null : voteType });
    } catch (error) {
      console.error("Error voting:", error);
      res.status(500).json({ error: "Failed to record vote" });
    }
  });

  app.post("/api/submissions/:id/metoo", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const clientIP = getClientIP(req);
      const userHash = hashIP(clientIP);

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const existingMeToo = await storage.getMeToo(id, userHash);
      let action: "added" | "removed" = "added";

      if (existingMeToo) {
        await storage.deleteMeToo(id, userHash);
        action = "removed";
      } else {
        await storage.createMeToo({
          submissionId: id,
          userHash,
        });
        action = "added";
      }

      await storage.updateMeTooCount(id);

      const updated = await storage.getSubmission(id);
      res.json({ ...updated, action });
    } catch (error) {
      console.error("Error toggling me too:", error);
      res.status(500).json({ error: "Failed to record reaction" });
    }
  });

  app.get("/api/submissions/:id/comments", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sortBy = req.query.sortBy as string || "wilson";

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const commentList = await storage.getCommentsWithWilsonScore(id);
      
      let sortedComments;
      if (sortBy === "wilson") {
        sortedComments = sortByWilsonScore(commentList);
      } else if (sortBy === "newest") {
        sortedComments = [...commentList].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else if (sortBy === "oldest") {
        sortedComments = [...commentList].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else {
        sortedComments = sortByWilsonScore(commentList);
      }
      
      res.json({ comments: sortedComments });
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/submissions/:id/comments", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, parentId } = req.body as { content: string; parentId?: string };

      const clientIP = getClientIP(req);
      const authorHash = hashIP(clientIP);

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      if (parentId) {
        const parentComment = await storage.getComment(parentId);
        if (!parentComment) {
          return res.status(404).json({ error: "Parent comment not found" });
        }
        if (parentComment.submissionId !== id) {
          return res.status(400).json({ error: "Parent comment belongs to different submission" });
        }
        if (parentComment.parentId) {
          return res.status(400).json({ error: "Cannot reply to a reply (max 2 levels)" });
        }
      }

      const parsed = insertCommentSchema.omit({ authorHash: true }).safeParse({
        submissionId: id,
        content,
        parentId: parentId || null,
      });

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid comment data",
          details: parsed.error.errors,
        });
      }

      const comment = await storage.createComment({
        submissionId: id,
        content,
        authorHash,
        parentId: parentId || null,
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.post("/api/comments/:commentId/vote", async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const { voteType } = req.body as { voteType: CommentVoteType };

      if (!["upvote", "downvote"].includes(voteType)) {
        return res.status(400).json({ error: "Invalid vote type" });
      }

      const clientIP = getClientIP(req);
      const voterHash = hashIP(clientIP);

      const comment = await storage.getComment(commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const existingVote = await storage.getCommentVote(commentId, voterHash);
      let action: "added" | "removed" | "changed" = "added";

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          await storage.deleteCommentVote(commentId, voterHash);
          action = "removed";
        } else {
          await storage.deleteCommentVote(commentId, voterHash);
          await storage.createCommentVote({
            commentId,
            voteType,
            voterHash,
          });
          action = "changed";
        }
      } else {
        await storage.createCommentVote({
          commentId,
          voteType,
          voterHash,
        });
        action = "added";
      }

      await storage.updateCommentVoteCounts(commentId);

      const updated = await storage.getComment(commentId);
      res.json({ 
        ...updated, 
        action, 
        currentVote: action === "removed" ? null : voteType 
      });
    } catch (error) {
      console.error("Error voting on comment:", error);
      res.status(500).json({ error: "Failed to record vote" });
    }
  });

  app.post("/api/submissions/:id/flag", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body as { reason: FlagReason };

      if (!["spam", "fake", "harmful", "other"].includes(reason)) {
        return res.status(400).json({ error: "Invalid flag reason" });
      }

      const clientIP = getClientIP(req);
      const reporterHash = hashIP(clientIP);

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const existingFlag = await storage.getFlag(id, reporterHash);
      if (existingFlag) {
        return res.status(400).json({ error: "You have already flagged this submission" });
      }

      await storage.createFlag({
        submissionId: id,
        reason,
        reporterHash,
      });

      await storage.updateFlagCount(id);

      res.json({ success: true, message: "Thank you, we'll review this submission" });
    } catch (error) {
      console.error("Error flagging:", error);
      res.status(500).json({ error: "Failed to flag submission" });
    }
  });

  app.get("/api/submissions/:id/reactions", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const counts = await storage.getReactionCounts(id);
      res.json({ reactions: counts });
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  app.post("/api/submissions/:id/react", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reactionType } = req.body as { reactionType: ReactionType };

      if (!VALID_REACTIONS.includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }

      const clientIP = getClientIP(req);
      const userHash = hashIP(clientIP);

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const existingReaction = await storage.getReaction(id, userHash, reactionType);
      let action: "added" | "removed" = "added";

      if (existingReaction) {
        await storage.deleteReaction(id, userHash, reactionType);
        action = "removed";
      } else {
        await storage.createReaction({
          submissionId: id,
          reactionType,
          userHash,
        });
        action = "added";
      }

      const counts = await storage.getReactionCounts(id);
      res.json({ reactions: counts, action, reactionType });
    } catch (error) {
      console.error("Error reacting:", error);
      res.status(500).json({ error: "Failed to record reaction" });
    }
  });

  app.post("/api/reactions/bulk", async (req: Request, res: Response) => {
    try {
      const { submissionIds } = req.body as { submissionIds: string[] };

      if (!Array.isArray(submissionIds)) {
        return res.status(400).json({ error: "submissionIds must be an array" });
      }

      if (submissionIds.length === 0) {
        return res.json({ reactions: {} });
      }

      if (submissionIds.length > 100) {
        return res.status(400).json({ error: "Maximum 100 submission IDs allowed" });
      }

      const counts = await storage.getReactionCountsForSubmissions(submissionIds);
      res.json({ reactions: counts });
    } catch (error) {
      console.error("Error fetching bulk reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = [
        { value: "leadership", label: "Leadership", description: "Pastoral abuse of power, authoritarianism" },
        { value: "financial", label: "Financial", description: "Tithing pressure, misuse of funds, lack of transparency" },
        { value: "culture", label: "Culture", description: "Cliques, exclusion, judgment, gossip" },
        { value: "misconduct", label: "Misconduct", description: "Sexual, ethical, or criminal behavior" },
        { value: "spiritual_abuse", label: "Spiritual Abuse", description: "Manipulation using scripture, shaming, control" },
        { value: "other", label: "Other", description: "Doesn't fit above" },
      ];
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/counts", async (req: Request, res: Response) => {
    try {
      const counts = await storage.getCategoryCounts();
      res.json({ counts });
    } catch (error) {
      console.error("Error fetching category counts:", error);
      res.status(500).json({ error: "Failed to fetch category counts" });
    }
  });

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { password } = req.body as { password: string };

      if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to authenticate" });
    }
  });

  app.get("/api/admin/submissions", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await storage.getAdminSubmissions({ page, limit });
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.patch("/api/admin/submissions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: Status };

      if (!["active", "under_review", "removed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updated = await storage.updateSubmissionStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating submission status:", error);
      res.status(500).json({ error: "Failed to update submission" });
    }
  });

  app.get("/api/admin/patterns", async (req: Request, res: Response) => {
    try {
      const patterns = await storage.getPatternData();
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching pattern data:", error);
      res.status(500).json({ error: "Failed to fetch pattern data" });
    }
  });

  app.get("/api/community/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching community stats:", error);
      res.status(500).json({ error: "Failed to fetch community stats" });
    }
  });

  app.post("/api/email-subscribers", async (req: Request, res: Response) => {
    console.log("POST /api/email-subscribers received:", JSON.stringify(req.body));
    try {
      const parsed = insertEmailSubscriberSchema.safeParse(req.body);
      if (!parsed.success) {
        console.log("Validation failed:", parsed.error.errors);
        return res.status(400).json({
          error: "Invalid subscriber data",
          details: parsed.error.errors,
        });
      }

      const existingSubscriber = await storage.getEmailSubscriberByEmail(parsed.data.email);
      if (existingSubscriber) {
        console.log("Already subscribed:", parsed.data.email);
        return res.json({ success: true, message: "Already subscribed", subscriber: existingSubscriber });
      }

      const subscriber = await storage.createEmailSubscriber(parsed.data);
      console.log("Created subscriber:", subscriber.id, subscriber.email);
      
      console.log("Sending welcome email to:", parsed.data.email);
      sendWelcomeEmail(parsed.data.email).then((result) => {
        if (result.success) {
          console.log("Welcome email sent successfully to:", parsed.data.email);
        } else {
          console.error("Welcome email failed:", result.error);
        }
      }).catch((err) => {
        console.error("Failed to send welcome email:", err);
      });
      
      res.status(201).json({ success: true, subscriber });
    } catch (error) {
      console.error("Error creating email subscriber:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  return httpServer;
}
