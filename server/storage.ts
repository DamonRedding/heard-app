import {
  submissions,
  votes,
  flags,
  meToos,
  comments,
  type Submission,
  type InsertSubmission,
  type Vote,
  type InsertVote,
  type Flag,
  type InsertFlag,
  type MeToo,
  type InsertMeToo,
  type Comment,
  type InsertComment,
  type Category,
  type Status,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, or, ilike } from "drizzle-orm";

export interface IStorage {
  getSubmissions(options?: {
    category?: Category;
    status?: Status;
    search?: string;
    denomination?: string;
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

  getMeToo(submissionId: string, userHash: string): Promise<MeToo | undefined>;

  createMeToo(meToo: InsertMeToo): Promise<MeToo>;

  deleteMeToo(submissionId: string, userHash: string): Promise<void>;

  updateMeTooCount(submissionId: string): Promise<void>;

  getComments(submissionId: string): Promise<Comment[]>;

  createComment(comment: InsertComment): Promise<Comment>;

  getPatternData(): Promise<{
    churchPatterns: { name: string; count: number; submissions: Submission[] }[];
    pastorPatterns: { name: string; count: number; submissions: Submission[] }[];
    locationPatterns: { name: string; count: number; submissions: Submission[] }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getSubmissions(options?: {
    category?: Category;
    status?: Status;
    search?: string;
    denomination?: string;
    page?: number;
    limit?: number;
  }): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [eq(submissions.status, "active")];
    if (options?.category) {
      conditions.push(eq(submissions.category, options.category));
    }
    if (options?.denomination) {
      conditions.push(eq(submissions.denomination, options.denomination));
    }
    if (options?.search) {
      const searchPattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(submissions.content, searchPattern),
          ilike(submissions.churchName, searchPattern),
          ilike(submissions.pastorName, searchPattern),
          ilike(submissions.location, searchPattern)
        )!
      );
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
          meTooCount: submissions.meTooCount,
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
        meTooCount: submissions.meTooCount,
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

  async getMeToo(submissionId: string, userHash: string): Promise<MeToo | undefined> {
    const [result] = await db
      .select()
      .from(meToos)
      .where(and(eq(meToos.submissionId, submissionId), eq(meToos.userHash, userHash)));
    return result;
  }

  async createMeToo(meToo: InsertMeToo): Promise<MeToo> {
    const [result] = await db.insert(meToos).values(meToo).returning();
    return result;
  }

  async deleteMeToo(submissionId: string, userHash: string): Promise<void> {
    await db
      .delete(meToos)
      .where(and(eq(meToos.submissionId, submissionId), eq(meToos.userHash, userHash)));
  }

  async updateMeTooCount(submissionId: string): Promise<void> {
    const [result] = await db
      .select({ count: count() })
      .from(meToos)
      .where(eq(meToos.submissionId, submissionId));

    await db
      .update(submissions)
      .set({ meTooCount: result?.count || 0 })
      .where(eq(submissions.id, submissionId));
  }

  async getComments(submissionId: string): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.submissionId, submissionId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [result] = await db.insert(comments).values(comment).returning();
    return result;
  }

  async getPatternData(): Promise<{
    churchPatterns: { name: string; count: number; submissions: Submission[] }[];
    pastorPatterns: { name: string; count: number; submissions: Submission[] }[];
    locationPatterns: { name: string; count: number; submissions: Submission[] }[];
  }> {
    const allSubmissions = await db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.createdAt));

    const churchMap = new Map<string, Submission[]>();
    const pastorMap = new Map<string, Submission[]>();
    const locationMap = new Map<string, Submission[]>();

    for (const sub of allSubmissions) {
      if (sub.churchName) {
        const key = sub.churchName.toLowerCase().trim();
        if (!churchMap.has(key)) churchMap.set(key, []);
        churchMap.get(key)!.push(sub);
      }
      if (sub.pastorName) {
        const key = sub.pastorName.toLowerCase().trim();
        if (!pastorMap.has(key)) pastorMap.set(key, []);
        pastorMap.get(key)!.push(sub);
      }
      if (sub.location) {
        const key = sub.location.toLowerCase().trim();
        if (!locationMap.has(key)) locationMap.set(key, []);
        locationMap.get(key)!.push(sub);
      }
    }

    const toPatternArray = (map: Map<string, Submission[]>) =>
      Array.from(map.entries())
        .map(([name, subs]) => ({
          name: subs[0].churchName || subs[0].pastorName || subs[0].location || name,
          count: subs.length,
          submissions: subs,
        }))
        .filter((p) => p.count >= 2)
        .sort((a, b) => b.count - a.count);

    return {
      churchPatterns: toPatternArray(churchMap).map((p) => ({
        ...p,
        name: p.submissions[0].churchName || p.name,
      })),
      pastorPatterns: toPatternArray(pastorMap).map((p) => ({
        ...p,
        name: p.submissions[0].pastorName || p.name,
      })),
      locationPatterns: toPatternArray(locationMap).map((p) => ({
        ...p,
        name: p.submissions[0].location || p.name,
      })),
    };
  }
}

export const storage = new DatabaseStorage();
