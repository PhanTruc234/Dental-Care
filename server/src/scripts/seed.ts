import { Gender, Role } from "../generated/prisma/enums.js";
import { env } from "../shared/configs/dotenv.js";
import { logger } from "../shared/configs/logger.js";
import { prisma } from "../shared/configs/prisma.js";
import { hashPassword } from "../shared/utils/password.js";

const ADMIN_EMPLOYEE_CODE = "NV000001";
const main = async () => {
    const email = env.SEED_ADMIN_EMAIL.trim().toLowerCase();
    const password = env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
        throw new Error("Thiếu SEED_ADMIN_EMAIL hoặc SEED_ADMIN_PASSWORD trong .env");
    }

    const existing = await prisma.user.findUnique({
        where: { email },
        select: { userId: true },
    });
    if (existing) {
        logger.info({ email }, "Tài khoản admin đã tồn tại — bỏ qua seed");
        return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
            data: {
                email,
                passwordHash,
                role: Role.ADMIN,
                emailVerified: true,
            },
        });
        await tx.staff.create({
            data: {
                userId: created.userId,
                employeeCode: ADMIN_EMPLOYEE_CODE,
                fullName: env.SEED_ADMIN_NAME,
                gender: Gender.UNKNOWN,
            },
        });
        return created;
    });

    logger.info({ userId: user.userId, email }, "Đã tạo tài khoản ADMIN đầu tiên");
};

main()
    .catch((err) => {
        logger.error({ err }, "Seed thất bại");
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });