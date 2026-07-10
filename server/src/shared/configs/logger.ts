import pino from "pino";
import { env } from "./dotenv.js";

const isDev = env.NODE_ENV !== "production";

export const logger = pino({
    level: env.LOG_LEVEL,
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "*.password",
            "*.token",
        ],
        censor: "[REDACTED]",
    },
    ...(isDev && {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:HH:MM:ss",
                ignore: "pid,hostname",
            },
        },
    }),
});
