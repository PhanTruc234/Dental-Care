import app from "./app.js";
import { env } from "./shared/configs/dotenv.js";
import { logger } from "./shared/configs/logger.js";
import { startTokenCleanupJob } from "./shared/jobs/token-cleanup.js";

const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`);
    startTokenCleanupJob();
});
const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
        logger.info("Server đã đóng kết nối HTTP.");

        try {
            logger.info("Database đã ngắt kết nối an toàn.");
        } catch (dbError) {
            logger.error({ dbError }, "Lỗi khi đóng kết nối Database");
        }
        logger.info("Thoát khỏi tiến trình hoàn toàn.");
        process.exit(0);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled Rejection");
});
process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught Exception");
    process.exit(1);
});
