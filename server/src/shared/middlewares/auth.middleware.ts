import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/token.js";
import { AccessTokenPayload, TokenPayload } from "../types/auth.types.js";
import { prisma } from "../configs/prisma.js";

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new UnauthorizedError("Access token không hợp lệ");
    }
    let payload: AccessTokenPayload;
    try {
        payload = verifyAccessToken(token) as AccessTokenPayload;
    } catch {
        throw new UnauthorizedError("Access token không hợp lệ hoặc đã hết hạn");
    }
    if (!payload.sid) {
        throw new UnauthorizedError("Phiên không hợp lệ, vui lòng đăng nhập lại");
    }
    const session = await prisma.refreshToken.findUnique({
        where: { id: payload.sid },
        select: {
            revokedAt: true,
            expiresAt: true,
            user: { select: { isActive: true, deletedAt: true } },
        },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedError("Phiên đã kết thúc, vui lòng đăng nhập lại");
    }
    if (!session.user.isActive || session.user.deletedAt) {
        throw new UnauthorizedError("Tài khoản đã bị vô hiệu hoá");
    }
    req.user = payload;
    next();
}