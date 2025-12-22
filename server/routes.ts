import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertCommentSchema, insertEmailSubscriberSchema, insertChurchRatingSchema, type Category, type VoteType, type FlagReason, type Status, type ReactionType, type CommentVoteType } from "@shared/schema";
import { sortByWilsonScore } from "@shared/wilson-score";
import { z } from "zod";
import { createHash } from "crypto";
import { sendWelcomeEmail } from "./email";
import { notifySubscribersOfNewSubmission, notifyAuthorOfEngagement, sendWeeklyDigest } from "./notification-service";
import { generateTitle } from "./title-generator";

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

  app.get("/api/submissions/personalized", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as "hot" | "new") || "hot";
      
      const boostParams = req.query.boost;
      const categoryBoosts: { category: Category; weight: number }[] = [];
      
      if (boostParams) {
        const boostArray = Array.isArray(boostParams) ? boostParams : [boostParams];
        for (const boost of boostArray) {
          const [category, weight] = (boost as string).split(":");
          if (category && weight) {
            categoryBoosts.push({
              category: category as Category,
              weight: parseInt(weight) || 0,
            });
          }
        }
      }

      const denominationBoost = req.query.denomination as string | undefined;

      const result = await storage.getPersonalizedSubmissions({
        categoryBoosts,
        denominationBoost,
        page,
        limit,
        sort,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching personalized submissions:", error);
      res.status(500).json({ error: "Failed to fetch personalized submissions" });
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

      const title = await generateTitle(
        parsed.data.content,
        parsed.data.category,
        parsed.data.timeframe,
        parsed.data.churchName,
        parsed.data.denomination
      );

      const submission = await storage.createSubmission({
        ...parsed.data,
        title,
      });

      notifySubscribersOfNewSubmission(submission).catch(err => {
        console.error("Error sending new submission notifications:", err);
      });

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

      if (action === "added") {
        notifyAuthorOfEngagement(id, "engagement_vote", `Your story received a new ${voteType} vote.`).catch(err => {
          console.error("Error sending vote notification:", err);
        });
      }

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

      if (action === "added") {
        notifyAuthorOfEngagement(id, "engagement_metoo", "Someone related to your story.").catch(err => {
          console.error("Error sending me-too notification:", err);
        });
      }

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

      await storage.updateCommentCount(id);

      notifyAuthorOfEngagement(id, "engagement_comment", "Someone commented on your story.").catch(err => {
        console.error("Error sending comment notification:", err);
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.post("/api/submissions/:id/view", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const clientIP = getClientIP(req);
      const viewerHash = hashIP(clientIP);

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const existingView = await storage.getView(id, viewerHash);
      if (existingView) {
        return res.json({ success: true, isNew: false });
      }

      await storage.createView(id, viewerHash);
      await storage.updateViewCount(id);

      res.json({ success: true, isNew: true });
    } catch (error) {
      console.error("Error tracking view:", error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });

  app.post("/api/admin/send-weekly-digest", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const result = await sendWeeklyDigest();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error sending weekly digest:", error);
      res.status(500).json({ error: "Failed to send weekly digest" });
    }
  });

  app.post("/api/admin/backfill-titles", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const submissionsWithoutTitles = await storage.getSubmissionsWithoutTitles();
      
      if (submissionsWithoutTitles.length === 0) {
        return res.json({ success: true, message: "All submissions already have titles", updated: 0 });
      }

      let updated = 0;
      const errors: string[] = [];

      for (const submission of submissionsWithoutTitles) {
        try {
          const title = await generateTitle(
            submission.content,
            submission.category,
            submission.timeframe,
            submission.churchName,
            submission.denomination
          );
          await storage.updateSubmissionTitle(submission.id, title);
          updated++;
        } catch (err) {
          console.error(`Failed to generate title for submission ${submission.id}:`, err);
          errors.push(submission.id);
        }
      }

      res.json({ 
        success: true, 
        message: `Generated titles for ${updated} submissions`,
        updated,
        total: submissionsWithoutTitles.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error backfilling titles:", error);
      res.status(500).json({ error: "Failed to backfill titles" });
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

  app.get("/api/search/suggestions", async (req: Request, res: Response) => {
    try {
      const query = (req.query.query as string || "").trim();
      const limit = Math.min(parseInt(req.query.limit as string) || 6, 10);

      if (!query || query.length < 1) {
        return res.json({ submissions: [], categories: [], denominations: [] });
      }

      const suggestions = await storage.getSearchSuggestions(query, limit);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching search suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
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

  // Email tracking pixel endpoint
  app.get("/api/email/track/:trackingId.png", async (req: Request, res: Response) => {
    const { trackingId } = req.params;
    try {
      await storage.markEmailOpened(trackingId);
    } catch (e) {
      console.error("Email tracking error:", e);
    }
    // Return 1x1 transparent PNG
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.send(pixel);
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
      // Create email tracking record and send with tracking pixel
      storage.createEmailTracking({
        subscriberEmail: parsed.data.email,
        emailType: "welcome",
        submissionId: parsed.data.submissionId,
      }).then((tracking) => {
        return sendWelcomeEmail(parsed.data.email, tracking.id);
      }).then((result) => {
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

  // Church Rating Routes
  app.post("/api/church-ratings", async (req: Request, res: Response) => {
    try {
      const clientIP = getClientIP(req);
      const ipHash = hashIP(clientIP);
      
      const parsed = insertChurchRatingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid rating data",
          details: parsed.error.errors,
        });
      }

      let { churchName, location, googlePlaceId } = parsed.data;

      // If we have a google place ID, check for existing canonical data
      // This ensures consistent naming across all ratings for the same church
      if (googlePlaceId) {
        const existingChurch = await storage.getChurchByGooglePlaceId(googlePlaceId);
        if (existingChurch) {
          // Force canonical name/location from existing ratings - override any user edits
          churchName = existingChurch.churchName;
          location = existingChurch.location;
        }
      }

      // Normalize church name for rate limiting (use googlePlaceId if available for consistency)
      const churchNameNormalized = googlePlaceId || churchName.toLowerCase().trim();
      
      // Check IP limit: 3 ratings per church per month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const ratingCount = await storage.getChurchRatingCount(ipHash, churchNameNormalized, oneMonthAgo);
      
      if (ratingCount >= 3) {
        return res.status(429).json({
          error: "You have already submitted 3 ratings for this church this month. Please try again later.",
        });
      }

      // Create the rating with canonicalized church data
      const rating = await storage.createChurchRating({
        ...parsed.data,
        churchName,
        location: location || null,
        googlePlaceId: googlePlaceId || null,
        submitterHash: ipHash,
      });

      // Create rate limit record
      await storage.createChurchRatingLimit({
        ipHash,
        churchNameNormalized,
        ratingId: rating.id,
      });

      res.status(201).json({ success: true, rating });
    } catch (error) {
      console.error("Error creating church rating:", error);
      res.status(500).json({ error: "Failed to submit rating" });
    }
  });

  app.get("/api/church-ratings/:churchName", async (req: Request, res: Response) => {
    try {
      const { churchName } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const ratings = await storage.getChurchRatings(decodeURIComponent(churchName), limit);
      res.json({ ratings });
    } catch (error) {
      console.error("Error fetching church ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  app.get("/api/church-ratings-check", async (req: Request, res: Response) => {
    try {
      const clientIP = getClientIP(req);
      const ipHash = hashIP(clientIP);
      const churchName = req.query.churchName as string;
      
      if (!churchName) {
        return res.json({ canRate: true, remaining: 3 });
      }

      const churchNameNormalized = churchName.toLowerCase().trim();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const ratingCount = await storage.getChurchRatingCount(ipHash, churchNameNormalized, oneMonthAgo);
      const remaining = Math.max(0, 3 - ratingCount);
      
      res.json({ 
        canRate: remaining > 0, 
        remaining,
        used: ratingCount,
      });
    } catch (error) {
      console.error("Error checking rating limit:", error);
      res.status(500).json({ error: "Failed to check rating limit" });
    }
  });

  // Get all rated churches
  app.get("/api/churches", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const churches = await storage.getRatedChurches(limit);
      res.json({ churches });
    } catch (error) {
      console.error("Error fetching churches:", error);
      res.status(500).json({ error: "Failed to fetch churches" });
    }
  });

  // Church search autocomplete
  app.get("/api/churches/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || "";
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const sessionToken = req.query.sessionToken as string || "";
      
      // Get local churches from database
      const localChurches = await storage.searchChurchNames(query, limit);
      
      // If we have a Google Maps API key, also search Google Places
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      let googleResults: Array<{
        name: string;
        location: string | null;
        ratingCount: number;
        googlePlaceId: string;
        source: "google";
      }> = [];
      
      if (googleApiKey && query.length >= 2) {
        try {
          const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
          placesUrl.searchParams.set("input", query);
          placesUrl.searchParams.set("types", "church");
          placesUrl.searchParams.set("key", googleApiKey);
          if (sessionToken) {
            placesUrl.searchParams.set("sessiontoken", sessionToken);
          }
          
          const placesResponse = await fetch(placesUrl.toString());
          const placesData = await placesResponse.json() as {
            status: string;
            predictions?: Array<{
              place_id: string;
              description: string;
              structured_formatting?: {
                main_text: string;
                secondary_text?: string;
              };
            }>;
          };
          
          if (placesData.status === "OK" && placesData.predictions) {
            // Get place_ids that already exist in local results
            const existingPlaceIds = new Set(
              localChurches
                .filter((c: { googlePlaceId?: string | null }) => c.googlePlaceId)
                .map((c: { googlePlaceId?: string | null }) => c.googlePlaceId)
            );
            
            // Filter to new predictions and extract location reliably
            const newPredictions = placesData.predictions
              .filter(p => !existingPlaceIds.has(p.place_id))
              .slice(0, 5);
            
            googleResults = newPredictions.map(prediction => {
              // Extract location from description - more reliable than structured_formatting
              const descParts = prediction.description.split(",");
              const name = prediction.structured_formatting?.main_text || descParts[0].trim();
              // Location is everything after the name
              const location = descParts.length > 1 
                ? descParts.slice(1).join(",").trim() 
                : (prediction.structured_formatting?.secondary_text || null);
              
              return {
                name,
                location,
                ratingCount: 0,
                googlePlaceId: prediction.place_id,
                source: "google" as const,
              };
            });
          }
        } catch (googleError) {
          console.error("Google Places API error:", googleError);
          // Continue with just local results
        }
      }
      
      // Mark local results with source
      const localWithSource = localChurches.map((c: { name: string; location: string | null; ratingCount: number; googlePlaceId?: string | null }) => ({
        ...c,
        source: "local" as const,
      }));
      
      // Combine: local first (already rated), then Google results
      const churches = [...localWithSource, ...googleResults].slice(0, limit);
      
      res.json({ churches });
    } catch (error) {
      console.error("Error searching churches:", error);
      res.status(500).json({ error: "Failed to search churches" });
    }
  });

  return httpServer;
}
