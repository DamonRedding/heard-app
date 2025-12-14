import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const categoryEnum = pgEnum("category", [
  "leadership",
  "financial", 
  "culture",
  "misconduct",
  "spiritual_abuse",
  "other"
]);

export const timeframeEnum = pgEnum("timeframe", [
  "last_month",
  "last_year",
  "one_to_five_years",
  "five_plus_years"
]);

export const statusEnum = pgEnum("status", [
  "active",
  "under_review",
  "removed"
]);

export const voteTypeEnum = pgEnum("vote_type", [
  "condemn",
  "absolve"
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
  "heart",
  "care",
  "haha",
  "wow",
  "sad",
  "angry"
]);

export const flagReasonEnum = pgEnum("flag_reason", [
  "spam",
  "fake",
  "harmful",
  "other"
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "engagement",
  "weekly_digest",
  "both"
]);

export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "new_submission",
  "engagement_vote",
  "engagement_comment", 
  "engagement_metoo",
  "weekly_digest"
]);

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  category: categoryEnum("category").notNull(),
  denomination: text("denomination"),
  timeframe: timeframeEnum("timeframe").notNull(),
  condemnCount: integer("condemn_count").notNull().default(0),
  absolveCount: integer("absolve_count").notNull().default(0),
  meTooCount: integer("me_too_count").notNull().default(0),
  flagCount: integer("flag_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  status: statusEnum("status").notNull().default("active"),
  churchName: text("church_name"),
  pastorName: text("pastor_name"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  voteType: voteTypeEnum("vote_type").notNull(),
  voterHash: text("voter_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueVote: uniqueIndex("votes_submission_voter_idx").on(table.submissionId, table.voterHash),
}));

export const flags = pgTable("flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  reason: flagReasonEnum("reason").notNull(),
  reporterHash: text("reporter_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const meToos = pgTable("me_toos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  userHash: text("user_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueMeToo: uniqueIndex("me_toos_submission_user_idx").on(table.submissionId, table.userHash),
}));

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id"),
  content: text("content").notNull(),
  authorHash: text("author_hash").notNull(),
  upvoteCount: integer("upvote_count").notNull().default(0),
  downvoteCount: integer("downvote_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentVoteTypeEnum = pgEnum("comment_vote_type", [
  "upvote",
  "downvote"
]);

export const commentVotes = pgTable("comment_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  voteType: commentVoteTypeEnum("vote_type").notNull(),
  voterHash: text("voter_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueCommentVote: uniqueIndex("comment_votes_comment_voter_idx").on(table.commentId, table.voterHash),
}));

export const reactions = pgTable("reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  reactionType: reactionTypeEnum("reaction_type").notNull(),
  userHash: text("user_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueReaction: uniqueIndex("reactions_submission_user_type_idx").on(table.submissionId, table.userHash, table.reactionType),
}));

export const submissionViews = pgTable("submission_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  viewerHash: text("viewer_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueView: uniqueIndex("submission_views_submission_viewer_idx").on(table.submissionId, table.viewerHash),
}));

export const submissionViewsRelations = relations(submissionViews, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionViews.submissionId],
    references: [submissions.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ many }) => ({
  votes: many(votes),
  flags: many(flags),
  meToos: many(meToos),
  comments: many(comments),
  reactions: many(reactions),
  views: many(submissionViews),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  submission: one(submissions, {
    fields: [votes.submissionId],
    references: [submissions.id],
  }),
}));

export const flagsRelations = relations(flags, ({ one }) => ({
  submission: one(submissions, {
    fields: [flags.submissionId],
    references: [submissions.id],
  }),
}));

export const meToosRelations = relations(meToos, ({ one }) => ({
  submission: one(submissions, {
    fields: [meToos.submissionId],
    references: [submissions.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  submission: one(submissions, {
    fields: [comments.submissionId],
    references: [submissions.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "commentReplies",
  }),
  replies: many(comments, {
    relationName: "commentReplies",
  }),
  votes: many(commentVotes),
}));

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentVotes.commentId],
    references: [comments.id],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  submission: one(submissions, {
    fields: [reactions.submissionId],
    references: [submissions.id],
  }),
}));

export const emailSubscribers = pgTable("email_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  submissionId: varchar("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  notifyOnEngagement: integer("notify_on_engagement").notNull().default(1),
  weeklyDigest: integer("weekly_digest").notNull().default(0),
  category: categoryEnum("category"),
  denomination: text("denomination"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueEmail: uniqueIndex("email_subscribers_email_idx").on(table.email),
}));

export const emailSubscribersRelations = relations(emailSubscribers, ({ one }) => ({
  submission: one(submissions, {
    fields: [emailSubscribers.submissionId],
    references: [submissions.id],
  }),
}));

export const notificationEvents = pgTable("notification_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriberEmail: text("subscriber_email").notNull(),
  submissionId: varchar("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  eventType: notificationEventTypeEnum("event_type").notNull(),
  metadata: text("metadata"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const notificationEventsRelations = relations(notificationEvents, ({ one }) => ({
  submission: one(submissions, {
    fields: [notificationEvents.submissionId],
    references: [submissions.id],
  }),
}));

export const emailTypeEnum = pgEnum("email_type", [
  "welcome",
  "engagement_notification",
  "weekly_digest"
]);

export const emailTracking = pgTable("email_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriberEmail: text("subscriber_email").notNull(),
  emailType: emailTypeEnum("email_type").notNull(),
  submissionId: varchar("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  openedAt: timestamp("opened_at"),
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  condemnCount: true,
  absolveCount: true,
  meTooCount: true,
  flagCount: true,
  status: true,
  createdAt: true,
}).extend({
  content: z.string().min(50, "Experience must be at least 50 characters").max(2000, "Experience must be less than 2000 characters"),
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertFlagSchema = createInsertSchema(flags).omit({
  id: true,
  createdAt: true,
});

export const insertMeTooSchema = createInsertSchema(meToos).omit({
  id: true,
  createdAt: true,
});

// Helper function to detect spam content patterns
function isSpamContent(text: string): boolean {
  const trimmed = text.trim();
  
  // Remove all whitespace and check what's left
  const noWhitespace = trimmed.replace(/\s+/g, '');
  
  // Check if content is mostly repetitive characters (like ******* or ====== or ------)
  if (noWhitespace.length > 0) {
    const charCounts = new Map<string, number>();
    for (const char of noWhitespace) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    // If a single character makes up more than 80% of the content, it's spam
    for (const [char, count] of charCounts) {
      if (count / noWhitespace.length > 0.8) {
        // Allow common punctuation only if content has meaningful text
        const meaningfulChars = noWhitespace.replace(/[^a-zA-Z0-9]/g, '');
        if (meaningfulChars.length < 5) {
          return true;
        }
      }
    }
  }
  
  // Check for lines that are just repeated symbols
  const lines = trimmed.split('\n');
  const symbolOnlyLines = lines.filter(line => {
    const stripped = line.trim();
    // Line is only symbols/punctuation (no letters or numbers)
    return stripped.length > 0 && !/[a-zA-Z0-9]/.test(stripped);
  });
  
  // If more than half the lines are symbol-only, it's spam
  if (lines.length > 1 && symbolOnlyLines.length > lines.length / 2) {
    return true;
  }
  
  // Check for very low letter/number ratio (less than 10% alphanumeric)
  const alphanumericCount = (noWhitespace.match(/[a-zA-Z0-9]/g) || []).length;
  if (noWhitespace.length > 10 && alphanumericCount / noWhitespace.length < 0.1) {
    return true;
  }
  
  return false;
}

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  upvoteCount: true,
  downvoteCount: true,
  createdAt: true,
}).extend({
  content: z.string()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment must be less than 500 characters")
    .refine(
      (text) => text.trim().length >= 3,
      "Comment must contain at least 3 characters"
    )
    .refine(
      (text) => !isSpamContent(text),
      "Please write a meaningful comment. Repetitive symbols or characters are not allowed."
    ),
  parentId: z.string().nullable().optional(),
});

export const insertCommentVoteSchema = createInsertSchema(commentVotes).omit({
  id: true,
  createdAt: true,
});

export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSubscriberSchema = createInsertSchema(emailSubscribers).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email("Please enter a valid email address"),
});

export const insertNotificationEventSchema = createInsertSchema(notificationEvents).omit({
  id: true,
  sentAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

export type InsertFlag = z.infer<typeof insertFlagSchema>;
export type Flag = typeof flags.$inferSelect;

export type InsertMeToo = z.infer<typeof insertMeTooSchema>;
export type MeToo = typeof meToos.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertCommentVote = z.infer<typeof insertCommentVoteSchema>;
export type CommentVote = typeof commentVotes.$inferSelect;
export type CommentVoteType = "upvote" | "downvote";

export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Reaction = typeof reactions.$inferSelect;

export type InsertEmailSubscriber = z.infer<typeof insertEmailSubscriberSchema>;
export type EmailSubscriber = typeof emailSubscribers.$inferSelect;

export type InsertNotificationEvent = z.infer<typeof insertNotificationEventSchema>;
export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type NotificationEventType = "new_submission" | "engagement_vote" | "engagement_comment" | "engagement_metoo" | "weekly_digest";

export type EmailTracking = typeof emailTracking.$inferSelect;
export type EmailType = "welcome" | "engagement_notification" | "weekly_digest";

export type SubmissionView = typeof submissionViews.$inferSelect;

export type Category = "leadership" | "financial" | "culture" | "misconduct" | "spiritual_abuse" | "other";
export type Timeframe = "last_month" | "last_year" | "one_to_five_years" | "five_plus_years";
export type VoteType = "condemn" | "absolve";
export type FlagReason = "spam" | "fake" | "harmful" | "other";
export type Status = "active" | "under_review" | "removed";
export type ReactionType = "heart" | "care" | "haha" | "wow" | "sad" | "angry";

export const CATEGORIES: { value: Category; label: string; description: string }[] = [
  { value: "leadership", label: "Leadership", description: "Pastoral abuse of power, authoritarianism" },
  { value: "financial", label: "Financial", description: "Tithing pressure, misuse of funds, lack of transparency" },
  { value: "culture", label: "Culture", description: "Cliques, exclusion, judgment, gossip" },
  { value: "misconduct", label: "Misconduct", description: "Sexual, ethical, or criminal behavior" },
  { value: "spiritual_abuse", label: "Spiritual Abuse", description: "Manipulation using scripture, shaming, control" },
  { value: "other", label: "Other", description: "Doesn't fit above" },
];

export const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "last_month", label: "Last month" },
  { value: "last_year", label: "Last year" },
  { value: "one_to_five_years", label: "1-5 years ago" },
  { value: "five_plus_years", label: "5+ years ago" },
];

export const DENOMINATIONS = [
  "Baptist",
  "Catholic",
  "Church of God in Christ (COGIC)",
  "Episcopal",
  "Evangelical",
  "Lutheran",
  "Methodist",
  "Non-denominational",
  "Orthodox",
  "Pentecostal",
  "Presbyterian",
  "Other",
];
