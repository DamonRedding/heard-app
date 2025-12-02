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

export const flagReasonEnum = pgEnum("flag_reason", [
  "spam",
  "fake",
  "harmful",
  "other"
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
  content: text("content").notNull(),
  authorHash: text("author_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const submissionsRelations = relations(submissions, ({ many }) => ({
  votes: many(votes),
  flags: many(flags),
  meToos: many(meToos),
  comments: many(comments),
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

export const commentsRelations = relations(comments, ({ one }) => ({
  submission: one(submissions, {
    fields: [comments.submissionId],
    references: [submissions.id],
  }),
}));

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

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
}).extend({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters"),
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

export type Category = "leadership" | "financial" | "culture" | "misconduct" | "spiritual_abuse" | "other";
export type Timeframe = "last_month" | "last_year" | "one_to_five_years" | "five_plus_years";
export type VoteType = "condemn" | "absolve";
export type FlagReason = "spam" | "fake" | "harmful" | "other";
export type Status = "active" | "under_review" | "removed";

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
  "Episcopal",
  "Lutheran",
  "Methodist",
  "Non-denominational",
  "Pentecostal",
  "Presbyterian",
  "Evangelical",
  "Orthodox",
  "Other",
];
