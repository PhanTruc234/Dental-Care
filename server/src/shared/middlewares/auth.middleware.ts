import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/token.js";
import { TokenPayload } from "../types/auth.types.js";

export const verifyUser = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new UnauthorizedError("Access token không hợp lệ")
    }
    try {
        req.user = verifyAccessToken(token) as TokenPayload;
        next();
    } catch (error) {
        throw new UnauthorizedError("Access token không hợp lệ hoặc đã hết hạn");
    }
}