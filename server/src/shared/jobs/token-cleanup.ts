import cron from "node-cron";
import { prisma } from "../configs/prisma.js";
import { logger } from "../configs/logger.js";

export const startTokenCleanupJob = () => {
    cron.schedule("0 3 * * *", async () => {
        try {
            const now = new Date();
            const revokedCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const result = await prisma.refreshToken.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lt: now } },
                        { revokedAt: { not: null, lt: revokedCutoff } },
                    ],
                },
            });
            logger.info({ deleted: result.count }, "Đã dọn refresh token cũ");
        } catch (err) {
            logger.error({ err }, "Lỗi khi dọn refresh token");
        }
    });
    logger.info("Đã bật cron dọn refresh token");
};
