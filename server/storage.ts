import {
  submissions,
  votes,
  flags,
  meToos,
  comments,
  reactions,
  emailSubscribers,
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
  type Reaction,
  type InsertReaction,
  type EmailSubscriber,
  type InsertEmailSubscriber,
  type Category,
  type Status,
  type ReactionType,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, or, ilike, inArray } from "drizzle-orm";

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

  getComment(id: string): Promise<Comment | undefined>;

  createComment(comment: InsertComment): Promise<Comment>;

  getPatternData(): Promise<{
    churchPatterns: { name: string; count: number; submissions: Submission[] }[];
    pastorPatterns: { name: string; count: number; submissions: Submission[] }[];
    locationPatterns: { name: string; count: number; submissions: Submission[] }[];
  }>;

  createEmailSubscriber(subscriber: InsertEmailSubscriber): Promise<EmailSubscriber>;

  getEmailSubscriberByEmail(email: string): Promise<EmailSubscriber | undefined>;

  getCommunityStats(): Promise<{
    totalSubmissions: number;
    totalEngagements: number;
    recentEngagementsThisMonth: number;
  }>;

  getRelatedPosts(options: {
    category?: Category;
    denomination?: string;
    excludeId?: string;
    limit?: number;
  }): Promise<Submission[]>;

  getReaction(submissionId: string, userHash: string, reactionType: ReactionType): Promise<Reaction | undefined>;

  getUserReactions(submissionId: string, userHash: string): Promise<Reaction[]>;

  createReaction(reaction: InsertReaction): Promise<Reaction>;

  deleteReaction(submissionId: string, userHash: string, reactionType: ReactionType): Promise<void>;

  getReactionCounts(submissionId: string): Promise<Record<string, number>>;

  getReactionCountsForSubmissions(submissionIds: string[]): Promise<Record<string, Record<string, number>>>;
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
      .orderBy(comments.createdAt);
  }

  async getComment(id: string): Promise<Comment | undefined> {
    const [result] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));
    return result;
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
      if (sub.churchName && sub.churchName.trim().length > 0) {
        const key = sub.churchName.toLowerCase().trim();
        if (!churchMap.has(key)) churchMap.set(key, []);
        churchMap.get(key)!.push(sub);
      }
      if (sub.pastorName && sub.pastorName.trim().length > 0) {
        const key = sub.pastorName.toLowerCase().trim();
        if (!pastorMap.has(key)) pastorMap.set(key, []);
        pastorMap.get(key)!.push(sub);
      }
      if (sub.location && sub.location.trim().length > 0) {
        const key = sub.location.toLowerCase().trim();
        if (!locationMap.has(key)) locationMap.set(key, []);
        locationMap.get(key)!.push(sub);
      }
    }

    const toPatternArray = (
      map: Map<string, Submission[]>,
      nameField: "churchName" | "pastorName" | "location"
    ) =>
      Array.from(map.entries())
        .filter(([key, subs]) => key.length > 0 && subs.length >= 2)
        .map(([_, subs]) => {
          const rawName = subs[0][nameField] || "";
          const trimmedName = typeof rawName === "string" ? rawName.trim() : "";
          return {
            name: trimmedName,
            count: subs.length,
            submissions: subs,
          };
        })
        .filter((p) => p.name.length > 0)
        .sort((a, b) => b.count - a.count);

    return {
      churchPatterns: toPatternArray(churchMap, "churchName"),
      pastorPatterns: toPatternArray(pastorMap, "pastorName"),
      locationPatterns: toPatternArray(locationMap, "location"),
    };
  }

  async createEmailSubscriber(subscriber: InsertEmailSubscriber): Promise<EmailSubscriber> {
    const [result] = await db.insert(emailSubscribers).values(subscriber).returning();
    return result;
  }

  async getEmailSubscriberByEmail(email: string): Promise<EmailSubscriber | undefined> {
    const [result] = await db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.email, email));
    return result;
  }

  async getCommunityStats(): Promise<{
    totalSubmissions: number;
    totalEngagements: number;
    recentEngagementsThisMonth: number;
  }> {
    const [submissionCount] = await db
      .select({ count: count() })
      .from(submissions)
      .where(eq(submissions.status, "active"));

    const allSubmissions = await db
      .select({
        condemnCount: submissions.condemnCount,
        absolveCount: submissions.absolveCount,
        meTooCount: submissions.meTooCount,
      })
      .from(submissions)
      .where(eq(submissions.status, "active"));

    let totalEngagements = 0;
    for (const sub of allSubmissions) {
      totalEngagements += (sub.condemnCount || 0) + (sub.absolveCount || 0) + (sub.meTooCount || 0);
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [recentVotes] = await db
      .select({ count: count() })
      .from(votes)
      .where(sql`${votes.createdAt} >= ${oneMonthAgo}`);

    const [recentMeToos] = await db
      .select({ count: count() })
      .from(meToos)
      .where(sql`${meToos.createdAt} >= ${oneMonthAgo}`);

    const recentEngagementsThisMonth = (recentVotes?.count || 0) + (recentMeToos?.count || 0);

    return {
      totalSubmissions: submissionCount?.count || 0,
      totalEngagements,
      recentEngagementsThisMonth,
    };
  }

  async getRelatedPosts(options: {
    category?: Category;
    denomination?: string;
    excludeId?: string;
    limit?: number;
  }): Promise<Submission[]> {
    const limit = options?.limit || 5;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const selectFields = {
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
    };

    const engagementOrder = desc(sql`${submissions.condemnCount} + ${submissions.absolveCount} + ${submissions.meTooCount}`);

    const conditions: ReturnType<typeof eq>[] = [eq(submissions.status, "active")];
    
    if (options.category) {
      conditions.push(eq(submissions.category, options.category));
    }
    if (options.denomination) {
      conditions.push(eq(submissions.denomination, options.denomination));
    }

    let results = await db
      .select(selectFields)
      .from(submissions)
      .where(and(...conditions, sql`${submissions.createdAt} >= ${sevenDaysAgo}`))
      .orderBy(engagementOrder)
      .limit(limit + 1);

    if (options.excludeId) {
      results = results.filter(r => r.id !== options.excludeId);
    }

    if (results.length < limit) {
      const existingIds = new Set(results.map(r => r.id));
      if (options.excludeId) existingIds.add(options.excludeId);

      const moreResults = await db
        .select(selectFields)
        .from(submissions)
        .where(and(...conditions))
        .orderBy(engagementOrder)
        .limit(limit * 2);

      for (const r of moreResults) {
        if (!existingIds.has(r.id) && results.length < limit) {
          results.push(r);
          existingIds.add(r.id);
        }
      }
    }

    if (results.length < limit) {
      const existingIds = new Set(results.map(r => r.id));
      if (options.excludeId) existingIds.add(options.excludeId);

      const anyPosts = await db
        .select(selectFields)
        .from(submissions)
        .where(eq(submissions.status, "active"))
        .orderBy(engagementOrder)
        .limit(limit * 2);

      for (const r of anyPosts) {
        if (!existingIds.has(r.id) && results.length < limit) {
          results.push(r);
          existingIds.add(r.id);
        }
      }
    }

    return results.slice(0, limit) as Submission[];
  }

  async getReaction(submissionId: string, userHash: string, reactionType: ReactionType): Promise<Reaction | undefined> {
    const [result] = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.submissionId, submissionId),
          eq(reactions.userHash, userHash),
          eq(reactions.reactionType, reactionType)
        )
      );
    return result;
  }

  async getUserReactions(submissionId: string, userHash: string): Promise<Reaction[]> {
    return db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.submissionId, submissionId),
          eq(reactions.userHash, userHash)
        )
      );
  }

  async createReaction(reaction: InsertReaction): Promise<Reaction> {
    const [result] = await db.insert(reactions).values(reaction).returning();
    return result;
  }

  async deleteReaction(submissionId: string, userHash: string, reactionType: ReactionType): Promise<void> {
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.submissionId, submissionId),
          eq(reactions.userHash, userHash),
          eq(reactions.reactionType, reactionType)
        )
      );
  }

  async getReactionCounts(submissionId: string): Promise<Record<string, number>> {
    const result = await db
      .select({
        reactionType: reactions.reactionType,
        count: count(),
      })
      .from(reactions)
      .where(eq(reactions.submissionId, submissionId))
      .groupBy(reactions.reactionType);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.reactionType] = row.count;
    }
    return counts;
  }

  async getReactionCountsForSubmissions(submissionIds: string[]): Promise<Record<string, Record<string, number>>> {
    if (submissionIds.length === 0) {
      return {};
    }

    const result = await db
      .select({
        submissionId: reactions.submissionId,
        reactionType: reactions.reactionType,
        count: count(),
      })
      .from(reactions)
      .where(inArray(reactions.submissionId, submissionIds))
      .groupBy(reactions.submissionId, reactions.reactionType);

    const countsMap: Record<string, Record<string, number>> = {};
    for (const row of result) {
      if (!countsMap[row.submissionId]) {
        countsMap[row.submissionId] = {};
      }
      countsMap[row.submissionId][row.reactionType] = row.count;
    }
    return countsMap;
  }
}

export const storage = new DatabaseStorage();
