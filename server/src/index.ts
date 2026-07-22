import express from "express";
import { config } from "./config.js";
import { activityRouter } from "./routes/activity.js";
import { authRouter } from "./routes/auth.js";
import { applicationsRouter } from "./routes/applications.js";
import { checklistRouter } from "./routes/checklist.js";
import { cvsRouter } from "./routes/cvs.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { filesRouter } from "./routes/files.js";
import { learningRouter } from "./routes/learning.js";
import { notificationsRouter } from "./routes/notifications.js";
import { portalsRouter } from "./routes/portals.js";
import { reviewsRouter } from "./routes/reviews.js";
import { roadmapRouter } from "./routes/roadmap.js";
import { vaultRouter } from "./routes/vault.js";
import { wordsRouter } from "./routes/words.js";
import { vaultSync } from "./services/vault/sync.js";

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/words", wordsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/vault", vaultRouter);
app.use("/api/files", filesRouter);
app.use("/api/checklist", checklistRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/cvs", cvsRouter);
app.use("/api/learning", learningRouter);
app.use("/api/learning/roadmap", roadmapRouter);
app.use("/api/portals", portalsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/activity", activityRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, async () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  await vaultSync.resumeAll();
});
