import {
  submissions,
  votes,
  flags,
  type Submission,
  type InsertSubmission,
  type Vote,
  type InsertVote,
  type Flag,
  type InsertFlag,
  type Category,
  type Status,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  getSubmissions(options?: {
    category?: Category;
    status?: Status;
    page?: number;
    limit?: number;
  }): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }>;

  getSubmission(id: string): Promise<Submission | undefined>;

  createSubmission(submission: InsertSubmission): Promise<Submission>;

  updateSubmissionStatus(id: string, status: Status): Promise<Submission | undefined>;

  getCategoryCounts(): Promise<Record<string, number>>;

  getVote(submissionId: string, voterHash: string): Promise<Vote | undefined>;

  createVote(vote: InsertVote): Promise<Vote>;

  deleteVote(submissionId: string, voterHash: string): Promise<void>;

  updateVoteCounts(submissionId: string): Promise<void>;

  createFlag(flag: InsertFlag): Promise<Flag>;

  getFlag(submissionId: string, reporterHash: string): Promise<Flag | undefined>;

  updateFlagCount(submissionId: string): Promise<void>;

  getAdminSubmissions(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ submissions: Submission[]; total: number }>;
}

export class DatabaseStorage implements IStorage {
  async getSubmissions(options?: {
    category?: Category;
    status?: Status;
    page?: number;
    limit?: number;
  }): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(submissions.status, "active")];
    if (options?.category) {
      conditions.push(eq(submissions.category, options.category));
    }

    const [result, countResult] = await Promise.all([
      db
        .select({
          id: submissions.id,
          content: submissions.content,
          category: submissions.category,
          denomination: submissions.denomination,
          timeframe: submissions.timeframe,
          condemnCount: submissions.condemnCount,
          absolveCount: submissions.absolveCount,
          flagCount: submissions.flagCount,
          status: submissions.status,
          churchName: sql<null>`NULL`.as('churchName'),
          pastorName: sql<null>`NULL`.as('pastorName'),
          location: sql<null>`NULL`.as('location'),
          createdAt: submissions.createdAt,
        })
        .from(submissions)
        .where(and(...conditions))
        .orderBy(desc(submissions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(submissions)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;
    const hasMore = offset + result.length < total;

    return {
      submissions: result as Submission[],
      total,
      hasMore,
    };
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const [result] = await db
      .select({
        id: submissions.id,
        content: submissions.content,
        category: submissions.category,
        denomination: submissions.denomination,
        timeframe: submissions.timeframe,
        condemnCount: submissions.condemnCount,
        absolveCount: submissions.absolveCount,
        flagCount: submissions.flagCount,
        status: submissions.status,
        churchName: sql<null>`NULL`.as('churchName'),
        pastorName: sql<null>`NULL`.as('pastorName'),
        location: sql<null>`NULL`.as('location'),
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .where(eq(submissions.id, id));
    return result as Submission | undefined;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [result] = await db
      .insert(submissions)
      .values(submission)
      .returning();
    return result;
  }

  async updateSubmissionStatus(id: string, status: Status): Promise<Submission | undefined> {
    const [result] = await db
      .update(submissions)
      .set({ status })
      .where(eq(submissions.id, id))
      .returning();
    return result;
  }

  async getCategoryCounts(): Promise<Record<string, number>> {
    const result = await db
      .select({
        category: submissions.category,
        count: count(),
      })
      .from(submissions)
      .where(eq(submissions.status, "active"))
      .groupBy(submissions.category);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.category] = row.count;
    }
    return counts;
  }

  async getVote(submissionId: string, voterHash: string): Promise<Vote | undefined> {
    const [result] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.submissionId, submissionId), eq(votes.voterHash, voterHash)));
    return result;
  }

  async createVote(vote: InsertVote): Promise<Vote> {
    const [result] = await db.insert(votes).values(vote).returning();
    return result;
  }

  async deleteVote(submissionId: string, voterHash: string): Promise<void> {
    await db
      .delete(votes)
      .where(and(eq(votes.submissionId, submissionId), eq(votes.voterHash, voterHash)));
  }

  async updateVoteCounts(submissionId: string): Promise<void> {
    const [condemnResult] = await db
      .select({ count: count() })
      .from(votes)
      .where(and(eq(votes.submissionId, submissionId), eq(votes.voteType, "condemn")));

    const [absolveResult] = await db
      .select({ count: count() })
      .from(votes)
      .where(and(eq(votes.submissionId, submissionId), eq(votes.voteType, "absolve")));

    await db
      .update(submissions)
      .set({
        condemnCount: condemnResult?.count || 0,
        absolveCount: absolveResult?.count || 0,
      })
      .where(eq(submissions.id, submissionId));
  }

  async createFlag(flag: InsertFlag): Promise<Flag> {
    const [result] = await db.insert(flags).values(flag).returning();
    return result;
  }

  async getFlag(submissionId: string, reporterHash: string): Promise<Flag | undefined> {
    const [result] = await db
      .select()
      .from(flags)
      .where(and(eq(flags.submissionId, submissionId), eq(flags.reporterHash, reporterHash)));
    return result;
  }

  async updateFlagCount(submissionId: string): Promise<void> {
    const [result] = await db
      .select({ count: count() })
      .from(flags)
      .where(eq(flags.submissionId, submissionId));

    const flagCount = result?.count || 0;
    const status = flagCount >= 3 ? "under_review" : undefined;

    if (status) {
      await db
        .update(submissions)
        .set({ flagCount, status })
        .where(eq(submissions.id, submissionId));
    } else {
      await db
        .update(submissions)
        .set({ flagCount })
        .where(eq(submissions.id, submissionId));
    }
  }

  async getAdminSubmissions(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ submissions: Submission[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    const [result, countResult] = await Promise.all([
      db
        .select()
        .from(submissions)
        .orderBy(desc(submissions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(submissions),
    ]);

    return {
      submissions: result,
      total: countResult[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
