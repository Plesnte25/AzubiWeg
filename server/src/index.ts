import express from "express";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { applicationsRouter } from "./routes/applications.js";
import { checklistRouter } from "./routes/checklist.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { filesRouter } from "./routes/files.js";
import { reviewsRouter } from "./routes/reviews.js";
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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, async () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  await vaultSync.resumeAll();
});
