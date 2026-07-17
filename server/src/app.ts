import express from "express";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./shared/middlewares/errorHandler.js";
import { httpLogger } from "./shared/middlewares/httpLogger.js";
import { configureSecurity } from "./shared/configs/security.js";
import { env } from "./shared/configs/dotenv.js";
import { buildOpenApiDocument } from "./shared/openapi/generate.js";
import { apiReference } from "@scalar/express-api-reference";
import { globalLimiter } from "./shared/configs/rate-limit.js";
import router from "./routes/index.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(httpLogger);
app.use(globalLimiter);
if (env.NODE_ENV !== "production") {
  const openApiDoc = buildOpenApiDocument();
  app.get("/openapi.json", (_req, res) => res.json(openApiDoc));
  app.use("/docs", apiReference({ spec: { url: "/openapi.json" } }));
}
configureSecurity(app);
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());
app.use("/api/v1", router);
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.set("trust proxy", 1);
app.use(notFoundHandler);
app.use(globalErrorHandler);
export default app;
