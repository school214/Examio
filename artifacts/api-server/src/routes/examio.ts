import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, attemptsTable, examsTable, questionsTable, resultsTable } from "@workspace/db";
import {
  GetAdminSummaryResponse,
  GetAttemptParams,
  GetAttemptResponse,
  GetDashboardResponse,
  GetExamParams,
  GetExamResponse,
  GetResultParams,
  GetResultResponse,
  ListAdminExamsResponse,
  ListExamsResponse,
  ListResultsResponse,
  SaveAttemptBody,
  SaveAttemptParams,
  SaveAttemptResponse,
  StartAttemptBody,
  StartAttemptResponse,
  SubmitAttemptParams,
  SubmitAttemptResponse,
  UpdateAdminExamBody,
  UpdateAdminExamParams,
  UpdateAdminExamResponse,
} from "@workspace/api-zod";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

type StudentQuestion = {
  id: string;
  number: number;
  type: string;
  text: string;
  points: number;
  section: string;
  concepts: string[];
  options: string[];
  imageUrl: string | null;
};

function iso(value: Date): string {
  return value.toISOString();
}

function toSummary(exam: typeof examsTable.$inferSelect) {
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    gradeLevel: exam.gradeLevel,
    description: exam.description,
    questionCount: exam.questionCount,
    durationMinutes: exam.durationMinutes,
    difficulty: exam.difficulty,
    types: exam.types,
    status: exam.status,
  };
}

function toStudentQuestion(question: typeof questionsTable.$inferSelect): StudentQuestion {
  return {
    id: question.id,
    number: question.number,
    type: question.type,
    text: question.text,
    points: question.points,
    section: question.section,
    concepts: question.concepts,
    options: question.options,
    imageUrl: question.imageUrl,
  };
}

function toAttempt(attempt: typeof attemptsTable.$inferSelect) {
  return {
    id: attempt.id,
    examId: attempt.examId,
    startedAt: iso(attempt.startedAt),
    status: attempt.status,
    currentQuestion: attempt.currentQuestion,
    answers: attempt.answers,
  };
}

function toResultSummary(result: typeof resultsTable.$inferSelect) {
  return {
    id: result.id,
    examId: result.examId,
    examTitle: result.examTitle,
    subject: result.subject,
    grade: result.grade,
    scorePercent: result.scorePercent,
    completedAt: iso(result.completedAt),
  };
}

function toResult(result: typeof resultsTable.$inferSelect) {
  return {
    ...toResultSummary(result),
    strengths: result.strengths,
    practiceAreas: result.practiceAreas,
    goldenFeedback: result.goldenFeedback,
    nextSteps: result.nextSteps,
    questionResults: result.questionResults,
    dimensionScores: result.dimensionScores,
  };
}

function parseParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

router.get("/exams", async (_req, res): Promise<void> => {
  const exams = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.status, "published"))
    .orderBy(asc(examsTable.subject));
  res.json(ListExamsResponse.parse(exams.map(toSummary)));
});

router.get("/exams/:examId", async (req, res): Promise<void> => {
  const params = GetExamParams.safeParse({ examId: parseParam(req.params.examId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.examId));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id))
    .orderBy(asc(questionsTable.number));
  res.json(GetExamResponse.parse({
    ...toSummary(exam),
    sections: exam.sections,
    questions: questions.map(toStudentQuestion),
  }));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const exams = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.status, "published"))
    .orderBy(asc(examsTable.subject));
  const results = await db.select().from(resultsTable).orderBy(desc(resultsTable.completedAt)).limit(3);

  res.json(GetDashboardResponse.parse({
    firstName: "Alex",
    activeExams: exams.map(toSummary),
    recentResults: results.map(toResultSummary),
    learningProfile: {
      subject: "Religionskunskap",
      dimensions: [
        { label: "Begrepp", score: 80 },
        { label: "Fakta", score: 90 },
        { label: "Resonemang", score: 60 },
        { label: "Jämförelser", score: 50 },
        { label: "Ämnesförståelse", score: 70 },
      ],
      focusLabel: "Resonemang",
      focusText: "Du kan ofta beskriva vad något är. Nästa steg är att förklara varför och vilka konsekvenser det kan få.",
    },
  }));
});

router.post("/attempts", async (req, res): Promise<void> => {
  const body = StartAttemptBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [exam] = await db.select({ id: examsTable.id }).from(examsTable).where(eq(examsTable.id, body.data.examId));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [attempt] = await db
    .insert(attemptsTable)
    .values({ id: randomUUID(), examId: body.data.examId, currentQuestion: 0, answers: [] })
    .returning();
  res.status(201).json(StartAttemptResponse.parse(toAttempt(attempt)));
});

router.get("/attempts/:attemptId", async (req, res): Promise<void> => {
  const params = GetAttemptParams.safeParse({ attemptId: parseParam(req.params.attemptId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, params.data.attemptId));
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  res.json(GetAttemptResponse.parse(toAttempt(attempt)));
});

router.patch("/attempts/:attemptId", async (req, res): Promise<void> => {
  const params = SaveAttemptParams.safeParse({ attemptId: parseParam(req.params.attemptId) });
  const body = SaveAttemptBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, params.data.attemptId));
  if (!attempt || attempt.status !== "in_progress") {
    res.status(404).json({ error: "Active attempt not found" });
    return;
  }

  const existing = attempt.answers.filter((item) => item.questionId !== body.data.questionId);
  const answers = [...existing, {
    questionId: body.data.questionId,
    answer: body.data.answer,
    marked: body.data.marked ?? false,
  }];
  const [updated] = await db
    .update(attemptsTable)
    .set({ answers })
    .where(eq(attemptsTable.id, attempt.id))
    .returning();
  res.json(SaveAttemptResponse.parse(toAttempt(updated)));
});

router.post("/attempts/:attemptId/submit", async (req, res): Promise<void> => {
  const params = SubmitAttemptParams.safeParse({ attemptId: parseParam(req.params.attemptId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, params.data.attemptId));
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, attempt.examId));
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, attempt.examId))
    .orderBy(asc(questionsTable.number));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer.answer.toLowerCase()]));
  const questionResults = questions.map((item) => {
    const answer = answerMap.get(item.id) ?? "";
    const expected = (item.correctAnswer ?? "").toLowerCase().split("|").filter(Boolean);
    const matched = expected.length > 0 && expected.every((part) => answer.includes(part));
    const partial = expected.length > 0 && expected.some((part) => answer.includes(part));
    const status = matched ? "Rätt" : partial ? "Delvis utvecklat" : "Behöver utvecklas";
    const feedback = matched
      ? "Du visar att du förstår de viktigaste delarna."
      : partial
        ? "Du är på rätt väg. Utveckla sambanden och lägg till ett konkret exempel."
        : "Försök använda fler ämnesbegrepp och förklara varför.";
    return { questionId: item.id, status, feedback };
  });
  const totalPoints = questions.reduce((sum, item) => sum + item.points, 0);
  const earnedPoints = questions.reduce((sum, item) => {
    const result = questionResults.find((entry) => entry.questionId === item.id);
    return sum + (result?.status === "Rätt" ? item.points : result?.status === "Delvis utvecklat" ? Math.ceil(item.points / 2) : 0);
  }, 0);
  const scorePercent = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
  const grade = scorePercent >= 85 ? "A" : scorePercent >= 70 ? "C" : scorePercent >= 55 ? "E" : "På väg";
  const dimensionScores = [
    { label: "Faktakunskaper", score: Math.min(98, Math.max(35, scorePercent + 8)) },
    { label: "Begreppsanvändning", score: Math.min(98, Math.max(30, scorePercent + 4)) },
    { label: "Resonemang", score: Math.min(95, Math.max(25, scorePercent - 10)) },
    { label: "Jämförelser", score: Math.min(95, Math.max(20, scorePercent - 16)) },
  ];

  const [result] = await db.insert(resultsTable).values({
    id: randomUUID(),
    examId: exam.id,
    examTitle: exam.title,
    subject: exam.subject,
    grade,
    scorePercent,
    strengths: ["Centrala begrepp", "Fakta och viktiga händelser", "Att hitta relevanta exempel"],
    practiceAreas: ["Resonemang", "Jämförelser", "Orsak och konsekvens"],
    goldenFeedback: "Du har bra koll på centrala begrepp. Det som framför allt skulle lyfta dina svar är att utveckla dina resonemang. Nästa steg är att förklara varför något händer och vilka konsekvenser det får.",
    nextSteps: ["Träna på att förklara varför.", "Använd fler ämnesbegrepp.", "Ge konkreta exempel.", "Jämför perspektiv i stället för att bara beskriva dem."],
    questionResults,
    dimensionScores,
  }).returning();

  await db.update(attemptsTable).set({ status: "submitted" }).where(eq(attemptsTable.id, attempt.id));
  res.json(SubmitAttemptResponse.parse(toResult(result)));
});

router.get("/results", async (_req, res): Promise<void> => {
  const results = await db.select().from(resultsTable).orderBy(desc(resultsTable.completedAt));
  res.json(ListResultsResponse.parse(results.map(toResultSummary)));
});

router.get("/results/:resultId", async (req, res): Promise<void> => {
  const params = GetResultParams.safeParse({ resultId: parseParam(req.params.resultId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [result] = await db.select().from(resultsTable).where(eq(resultsTable.id, params.data.resultId));
  if (!result) {
    res.status(404).json({ error: "Result not found" });
    return;
  }
  res.json(GetResultResponse.parse(toResult(result)));
});

router.get("/admin/summary", async (_req, res): Promise<void> => {
  const exams = await db.select().from(examsTable);
  const questions = await db.select({ id: questionsTable.id }).from(questionsTable);
  const attempts = await db.select().from(attemptsTable);
  const results = await db.select().from(resultsTable);
  const averageScore = results.length ? Math.round(results.reduce((sum, result) => sum + result.scorePercent, 0) / results.length) : 0;
  res.json(GetAdminSummaryResponse.parse({
    totalExams: exams.length,
    totalQuestions: questions.length,
    totalAttempts: attempts.length,
    averageScore,
    mostCompletedExam: "Övningsprov: Hinduism",
    aiUsage: 0,
  }));
});

router.get("/admin/exams", async (_req, res): Promise<void> => {
  const exams = await db.select().from(examsTable).orderBy(desc(examsTable.updatedAt));
  res.json(ListAdminExamsResponse.parse(exams.map((exam) => ({
    ...toSummary(exam),
    createdAt: iso(exam.createdAt),
    updatedAt: iso(exam.updatedAt),
  }))));
});

router.patch("/admin/exams/:examId", async (req, res): Promise<void> => {
  const params = UpdateAdminExamParams.safeParse({ examId: parseParam(req.params.examId) });
  const body = UpdateAdminExamBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [exam] = await db
    .update(examsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(examsTable.id, params.data.examId))
    .returning();
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(UpdateAdminExamResponse.parse({
    ...toSummary(exam),
    createdAt: iso(exam.createdAt),
    updatedAt: iso(exam.updatedAt),
  }));
});

export default router;