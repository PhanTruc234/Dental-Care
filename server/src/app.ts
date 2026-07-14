import express from "express";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./shared/middlewares/errorHandler.js";
import { httpLogger } from "./shared/middlewares/httpLogger.js";
import { configureSecurity } from "./shared/configs/security.js";

const app = express();
app.use(httpLogger);
configureSecurity(app);
app.use(express.json({ limit: '50kb' }));
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.use(notFoundHandler);
app.use(globalErrorHandler);
export default app;
