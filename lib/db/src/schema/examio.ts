import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const examsTable = pgTable("examio_exams", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level").notNull(),
  description: text("description").notNull(),
  questionCount: integer("question_count").notNull(),
  durationMinutes: integer("duration_minutes"),
  difficulty: text("difficulty").notNull(),
  types: text("types").array().notNull(),
  status: text("status").notNull().default("published"),
  sections: jsonb("sections").$type<Array<{ title: string; description: string }>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionsTable = pgTable("examio_questions", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull(),
  number: integer("number").notNull(),
  type: text("type").notNull(),
  text: text("text").notNull(),
  points: integer("points").notNull(),
  section: text("section").notNull(),
  concepts: text("concepts").array().notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  imageUrl: text("image_url"),
  correctAnswer: text("correct_answer"),
  rubric: text("rubric"),
});

export const attemptsTable = pgTable("examio_attempts", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("in_progress"),
  currentQuestion: integer("current_question").notNull().default(0),
  answers: jsonb("answers")
    .$type<Array<{ questionId: string; answer: string; marked: boolean }>>()
    .notNull()
    .default([]),
});

export const resultsTable = pgTable("examio_results", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull(),
  examTitle: text("exam_title").notNull(),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  scorePercent: integer("score_percent").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  practiceAreas: jsonb("practice_areas").$type<string[]>().notNull(),
  goldenFeedback: text("golden_feedback").notNull(),
  nextSteps: jsonb("next_steps").$type<string[]>().notNull(),
  questionResults: jsonb("question_results")
    .$type<Array<{ questionId: string; status: string; feedback: string }>>()
    .notNull(),
  dimensionScores: jsonb("dimension_scores")
    .$type<Array<{ label: string; score: number }>>()
    .notNull(),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertQuestionSchema = createInsertSchema(questionsTable);
export const insertAttemptSchema = createInsertSchema(attemptsTable).omit({
  startedAt: true,
});
export const insertResultSchema = createInsertSchema(resultsTable).omit({
  completedAt: true,
});

export type Exam = typeof examsTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
export type Attempt = typeof attemptsTable.$inferSelect;
export type Result = typeof resultsTable.$inferSelect;
export type AttemptAnswer = z.infer<typeof insertAttemptSchema>["answers"];