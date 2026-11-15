import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { changeScope, publish, subscribe } from "../services/live/hub.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

// Comment line every 25s: keeps Caddy, mobile carriers and idle-timeout
// proxies from closing a stream that has had nothing to say for a while.
const KEEPALIVE_MS = 25_000;

eventsRouter.get("/", (req, res) => {
  const clientId = String(req.query.clientId ?? "");
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 3000\n\n");
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  send("ready", {});
  const unsubscribe = subscribe(req.userId, { clientId, send });
  const keepalive = setInterval(() => res.write(": ping\n\n"), KEEPALIVE_MS);
  req.on("close", () => {
    clearInterval(keepalive);
    unsubscribe();
  });
});

/** Mounted before the routers: once a write has succeeded, tells the user's other devices. */
export function broadcastChanges(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (!req.userId) return;
    const scope = changeScope(req.method, req.originalUrl.split("?")[0], res.statusCode);
    if (scope) publish(req.userId, scope, req.get("X-Client-Id") ?? undefined);
  });
  next();
}
