import { Request } from 'express';
import rateLimit, { Options } from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis'; // Bật lên khi deploy Production

const commonConfig: Partial<Options> = {
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
    // store: new RedisStore({ ... }) // Nên dùng Redis trên Production
};

export const globalLimiter = rateLimit({
    ...commonConfig,
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút' },
});

export const authLimiter = rateLimit({
    ...commonConfig,
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: { message: 'Quá nhiều lần đăng nhập thất bại, thử lại sau 15 phút' },
});

export const createLimiter = rateLimit({
    ...commonConfig,
    windowMs: 60 * 1000,
    max: 30,
    message: { message: 'Quá nhiều request tạo tài nguyên, thử lại sau 1 phút' },
});

export const userActionLimiter = rateLimit({
    ...commonConfig,
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req: Request): string => {
        const userId = req.user?.id;
        return userId?.toString() || req.ip || 'unknown-ip';
    },
    message: { message: 'Thao tác quá nhanh, vui lòng chờ' },
});