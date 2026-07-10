import express from "express";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./shared/middlewares/errorHandler.js";
import { httpLogger } from "./shared/middlewares/httpLogger.js";
import helmet from "helmet";
import cors from "cors";

const app = express();
app.use(httpLogger);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.use(notFoundHandler);
app.use(globalErrorHandler);
export default app;
