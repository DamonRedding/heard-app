import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubmissionSchema, insertCommentSchema, type Category, type VoteType, type FlagReason, type Status } from "@shared/schema";
import { z } from "zod";
import { createHash } from "crypto";

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

      const result = await storage.getSubmissions({
        category,
        search,
        denomination,
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
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

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const commentList = await storage.getComments(id);
      res.json({ comments: commentList });
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/submissions/:id/comments", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body as { content: string };

      const clientIP = getClientIP(req);
      const authorHash = hashIP(clientIP);

      const submission = await storage.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const parsed = insertCommentSchema.omit({ authorHash: true }).safeParse({
        submissionId: id,
        content,
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
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
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

  return httpServer;
}
