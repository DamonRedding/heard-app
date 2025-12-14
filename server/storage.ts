import {
  submissions,
  votes,
  flags,
  meToos,
  comments,
  commentVotes,
  reactions,
  emailSubscribers,
  notificationEvents,
  emailTracking,
  submissionViews,
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
  type CommentVote,
  type InsertCommentVote,
  type CommentVoteType,
  type Reaction,
  type InsertReaction,
  type EmailSubscriber,
  type InsertEmailSubscriber,
  type NotificationEvent,
  type InsertNotificationEvent,
  type NotificationEventType,
  type EmailTracking,
  type EmailType,
  type SubmissionView,
  type Category,
  type Status,
  type ReactionType,
} from "@shared/schema";
import { sortByWilsonScore, withWilsonScore } from "@shared/wilson-score";
import { db } from "./db";
import { eq, and, desc, sql, count, or, ilike, inArray, gte } from "drizzle-orm";

export type SortType = "hot" | "new";

export interface IStorage {
  getSubmissions(options?: {
    category?: Category;
    status?: Status;
    search?: string;
    denomination?: string;
    page?: number;
    limit?: number;
    sort?: SortType;
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

  getCommentsWithWilsonScore(submissionId: string): Promise<(Comment & { wilsonScore: number })[]>;

  getComment(id: string): Promise<Comment | undefined>;

  createComment(comment: InsertComment): Promise<Comment>;

  getCommentVote(commentId: string, voterHash: string): Promise<CommentVote | undefined>;

  createCommentVote(vote: InsertCommentVote): Promise<CommentVote>;

  deleteCommentVote(commentId: string, voterHash: string): Promise<void>;

  updateCommentVoteCounts(commentId: string): Promise<void>;

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

  getSubscribersForNewSubmission(category: Category, denomination?: string | null): Promise<EmailSubscriber[]>;

  getSubscriberBySubmissionId(submissionId: string): Promise<EmailSubscriber | undefined>;

  getAllWeeklyDigestSubscribers(): Promise<EmailSubscriber[]>;

  createNotificationEvent(event: InsertNotificationEvent): Promise<NotificationEvent>;

  hasRecentNotification(email: string, submissionId: string, eventType: NotificationEventType, hoursAgo: number): Promise<boolean>;

  getPopularSubmissionsForDigest(limit: number): Promise<Submission[]>;

  createEmailTracking(data: { subscriberEmail: string; emailType: EmailType; submissionId?: string | null }): Promise<EmailTracking>;

  markEmailOpened(trackingId: string): Promise<void>;

  getPersonalizedSubmissions(options: {
    categoryBoosts: { category: Category; weight: number }[];
    denominationBoost?: string;
    page?: number;
    limit?: number;
    sort?: SortType;
  }): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }>;

  getView(submissionId: string, viewerHash: string): Promise<SubmissionView | undefined>;

  createView(submissionId: string, viewerHash: string): Promise<SubmissionView>;

  updateViewCount(submissionId: string): Promise<void>;

  updateCommentCount(submissionId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSubmissions(options?: {
    category?: Category;
    status?: Status;
    search?: string;
    denomination?: string;
    page?: number;
    limit?: number;
    sort?: SortType;
  }): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    const sortType = options?.sort || "hot";

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

    const hotScoreExpression = sql`
      (${submissions.condemnCount} + ${submissions.absolveCount}) / 
      POWER(EXTRACT(EPOCH FROM (NOW() - ${submissions.createdAt})) / 3600 + 2, 1.5)
    `;

    const orderBy = sortType === "new" 
      ? desc(submissions.createdAt)
      : desc(hotScoreExpression);

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
        .orderBy(orderBy)
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

  async getCommentsWithWilsonScore(submissionId: string): Promise<(Comment & { wilsonScore: number })[]> {
    const commentList = await db
      .select()
      .from(comments)
      .where(eq(comments.submissionId, submissionId));
    
    return withWilsonScore(commentList);
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

  async getCommentVote(commentId: string, voterHash: string): Promise<CommentVote | undefined> {
    const [result] = await db
      .select()
      .from(commentVotes)
      .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.voterHash, voterHash)));
    return result;
  }

  async createCommentVote(vote: InsertCommentVote): Promise<CommentVote> {
    const [result] = await db.insert(commentVotes).values(vote).returning();
    return result;
  }

  async deleteCommentVote(commentId: string, voterHash: string): Promise<void> {
    await db
      .delete(commentVotes)
      .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.voterHash, voterHash)));
  }

  async updateCommentVoteCounts(commentId: string): Promise<void> {
    const [upvoteResult] = await db
      .select({ count: count() })
      .from(commentVotes)
      .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.voteType, "upvote")));

    const [downvoteResult] = await db
      .select({ count: count() })
      .from(commentVotes)
      .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.voteType, "downvote")));

    await db
      .update(comments)
      .set({
        upvoteCount: upvoteResult?.count || 0,
        downvoteCount: downvoteResult?.count || 0,
      })
      .where(eq(comments.id, commentId));
  }

  async getPatternData(): Promise<{
    churchPatterns: { name: string; count: number; submissions: Submission[] }[];
    pastorPatterns: { name: string; count: number; submissions: Submission[] }[];
    locationPatterns: { name: string; count: number; submissions: Submission[] }[];
  }> {
    const allSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.status, "active"))
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

  async getSubscribersForNewSubmission(category: Category, denomination?: string | null): Promise<EmailSubscriber[]> {
    const conditions: ReturnType<typeof eq>[] = [eq(emailSubscribers.notifyOnEngagement, 1)];
    
    const result = await db
      .select()
      .from(emailSubscribers)
      .where(and(...conditions));

    return result.filter(sub => {
      if (sub.category && sub.category !== category) return false;
      if (sub.denomination && denomination && sub.denomination !== denomination) return false;
      return true;
    });
  }

  async getSubscriberBySubmissionId(submissionId: string): Promise<EmailSubscriber | undefined> {
    const [result] = await db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.submissionId, submissionId));
    return result;
  }

  async getAllWeeklyDigestSubscribers(): Promise<EmailSubscriber[]> {
    return db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.weeklyDigest, 1));
  }

  async createNotificationEvent(event: InsertNotificationEvent): Promise<NotificationEvent> {
    const [result] = await db.insert(notificationEvents).values(event).returning();
    return result;
  }

  async hasRecentNotification(email: string, submissionId: string, eventType: NotificationEventType, hoursAgo: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const [result] = await db
      .select({ count: count() })
      .from(notificationEvents)
      .where(
        and(
          eq(notificationEvents.subscriberEmail, email),
          eq(notificationEvents.submissionId, submissionId),
          eq(notificationEvents.eventType, eventType),
          gte(notificationEvents.sentAt, cutoff)
        )
      );
    return (result?.count || 0) > 0;
  }

  async getPopularSubmissionsForDigest(limit: number): Promise<Submission[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db
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
      .where(
        and(
          eq(submissions.status, "active"),
          gte(submissions.createdAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(sql`${submissions.condemnCount} + ${submissions.absolveCount} + ${submissions.meTooCount}`))
      .limit(limit);

    return result as Submission[];
  }

  async createEmailTracking(data: { subscriberEmail: string; emailType: EmailType; submissionId?: string | null }): Promise<EmailTracking> {
    const [result] = await db
      .insert(emailTracking)
      .values({
        subscriberEmail: data.subscriberEmail,
        emailType: data.emailType,
        submissionId: data.submissionId || null,
      })
      .returning();
    return result;
  }

  async markEmailOpened(trackingId: string): Promise<void> {
    await db
      .update(emailTracking)
      .set({ openedAt: new Date() })
      .where(and(
        eq(emailTracking.id, trackingId),
        sql`${emailTracking.openedAt} IS NULL`
      ));
  }

  async getPersonalizedSubmissions(options: {
    categoryBoosts: { category: Category; weight: number }[];
    page?: number;
    limit?: number;
    sort?: SortType;
  }): Promise<{ submissions: Submission[]; total: number; hasMore: boolean }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sortType = options.sort || "hot";

    const conditions: ReturnType<typeof eq>[] = [eq(submissions.status, "active")];

    const hotScoreExpression = sql`
      (${submissions.condemnCount} + ${submissions.absolveCount}) / 
      POWER(EXTRACT(EPOCH FROM (NOW() - ${submissions.createdAt})) / 3600 + 2, 1.5)
    `;

    const baseOrderBy = sortType === "new" 
      ? desc(submissions.createdAt)
      : desc(hotScoreExpression);

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
      viewCount: submissions.viewCount,
      commentCount: submissions.commentCount,
      status: submissions.status,
      churchName: sql<null>`NULL`.as('churchName'),
      pastorName: sql<null>`NULL`.as('pastorName'),
      location: sql<null>`NULL`.as('location'),
      createdAt: submissions.createdAt,
    };

    if (options.categoryBoosts.length === 0) {
      const [result, countResult] = await Promise.all([
        db
          .select(selectFields)
          .from(submissions)
          .where(and(...conditions))
          .orderBy(baseOrderBy)
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

    const rawTotalWeight = options.categoryBoosts.reduce((sum, b) => sum + b.weight, 0);
    const cappedTotalWeight = Math.min(rawTotalWeight, 80);
    
    const boostedSlots = Math.floor(limit * (cappedTotalWeight / 100));
    const regularSlots = limit - boostedSlots;

    const categorySlots: { category: Category; slots: number }[] = options.categoryBoosts.map(boost => ({
      category: boost.category,
      slots: Math.max(1, Math.round(boostedSlots * (boost.weight / rawTotalWeight))),
    }));

    let totalAllocated = categorySlots.reduce((sum, cs) => sum + cs.slots, 0);
    while (totalAllocated > boostedSlots && categorySlots.length > 0) {
      const maxSlotCategory = categorySlots.reduce((max, cs) => cs.slots > max.slots ? cs : max, categorySlots[0]);
      maxSlotCategory.slots--;
      totalAllocated--;
    }

    const categoryQueries = categorySlots.map(cs => 
      cs.slots > 0
        ? db
            .select(selectFields)
            .from(submissions)
            .where(and(
              eq(submissions.status, "active"),
              eq(submissions.category, cs.category)
            ))
            .orderBy(baseOrderBy)
            .limit(cs.slots + 5)
        : Promise.resolve([])
    );

    const regularQuery = db
      .select(selectFields)
      .from(submissions)
      .where(eq(submissions.status, "active"))
      .orderBy(baseOrderBy)
      .limit(limit * 2)
      .offset(offset);

    const countQuery = db
      .select({ count: count() })
      .from(submissions)
      .where(and(...conditions));

    const [categoryResults, regularResult, countResult] = await Promise.all([
      Promise.all(categoryQueries),
      regularQuery,
      countQuery,
    ]);

    const boostedPosts: Submission[] = [];
    const usedIds = new Set<string>();

    categoryResults.forEach((results, idx) => {
      const targetSlots = categorySlots[idx].slots;
      let added = 0;
      for (const post of results as Submission[]) {
        if (!usedIds.has(post.id) && added < targetSlots) {
          boostedPosts.push(post);
          usedIds.add(post.id);
          added++;
        }
      }
    });

    const regularPosts: Submission[] = [];
    for (const post of regularResult as Submission[]) {
      if (!usedIds.has(post.id) && regularPosts.length < regularSlots) {
        regularPosts.push(post);
        usedIds.add(post.id);
      }
    }

    const combined = [...boostedPosts, ...regularPosts];
    
    const boostedCategories = new Set(options.categoryBoosts.map(b => b.category));
    const categoryWeightMap = new Map(options.categoryBoosts.map(b => [b.category, b.weight]));
    
    if (sortType === "new") {
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      combined.sort((a, b) => {
        const calculateCompositeScore = (post: Submission): number => {
          const categoryWeight = categoryWeightMap.get(post.category as Category) || 0;
          const relevanceScore = 1 + (categoryWeight / 100) * 3;
          
          const ageInDays = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          const recencyScore = ageInDays >= 7 ? 0.5 : 1 - (ageInDays / 14);
          
          const totalReactions = post.condemnCount + post.absolveCount + post.meTooCount;
          const viewCount = Math.max(post.viewCount || 1, 1);
          const commentCount = post.commentCount || 0;
          const engagementRate = (totalReactions + commentCount * 2) / viewCount;
          const engagementScore = Math.min(engagementRate + 0.1, 2);
          
          return relevanceScore * recencyScore * engagementScore;
        };
        
        return calculateCompositeScore(b) - calculateCompositeScore(a);
      });
    }

    const total = countResult[0]?.count || 0;
    const hasMore = offset + combined.length < total;

    return {
      submissions: combined.slice(0, limit),
      total,
      hasMore,
    };
  }

  async getView(submissionId: string, viewerHash: string): Promise<SubmissionView | undefined> {
    const [result] = await db
      .select()
      .from(submissionViews)
      .where(and(eq(submissionViews.submissionId, submissionId), eq(submissionViews.viewerHash, viewerHash)));
    return result;
  }

  async createView(submissionId: string, viewerHash: string): Promise<SubmissionView> {
    const [result] = await db
      .insert(submissionViews)
      .values({ submissionId, viewerHash })
      .returning();
    return result;
  }

  async updateViewCount(submissionId: string): Promise<void> {
    const [result] = await db
      .select({ count: count() })
      .from(submissionViews)
      .where(eq(submissionViews.submissionId, submissionId));

    await db
      .update(submissions)
      .set({ viewCount: result?.count || 0 })
      .where(eq(submissions.id, submissionId));
  }

  async updateCommentCount(submissionId: string): Promise<void> {
    const [result] = await db
      .select({ count: count() })
      .from(comments)
      .where(eq(comments.submissionId, submissionId));

    await db
      .update(submissions)
      .set({ commentCount: result?.count || 0 })
      .where(eq(submissions.id, submissionId));
  }
}

export const storage = new DatabaseStorage();
