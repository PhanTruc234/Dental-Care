import jwt, { type SignOptions } from "jsonwebtoken"
import crypto from "crypto";
import { env } from "../configs/dotenv.js"
import { TokenPayload } from "../types/auth.types.js"
import { COOKIE_DEFAULTS } from "../constants/cookie.js";
import { Response } from "express";
import { expiresIn } from "./time.js";

const DEFAULT_MAX_AGE = 86400000;
const MULTIPLIERS = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 } as const;
type Unit = keyof typeof MULTIPLIERS;

function parseDuration(expiresIn: SignOptions["expiresIn"]): number {
    if (expiresIn === undefined) return DEFAULT_MAX_AGE;
    if (typeof expiresIn === "number") return expiresIn * 1000;
    const match = expiresIn.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) return DEFAULT_MAX_AGE;
    const value = parseInt(match[1], 10);
    const unit = match[2] as Unit;
    return value * MULTIPLIERS[unit];
}
export const generateAccessToken = (payload: TokenPayload & { sid: string }) => {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}
export const generateRefreshToken = (payload: TokenPayload) => {
    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
        expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
    })
}
export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, env.JWT_SECRET);
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
};
export const generateRandomToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

export const hashToken = (token: string) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};
export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
    res.cookie("accessToken", accessToken, {
        ...COOKIE_DEFAULTS,
        maxAge: parseDuration(env.JWT_EXPIRES_IN),
    });
    res.cookie("refreshToken", refreshToken, {
        ...COOKIE_DEFAULTS,
        maxAge: parseDuration(env.REFRESH_TOKEN_EXPIRES_IN),
    });
};

export const clearAuthCookies = (res: Response) => {
    res.clearCookie("accessToken", COOKIE_DEFAULTS);
    res.clearCookie("refreshToken", COOKIE_DEFAULTS);
};

export const refreshTokenExpiry = (): Date =>
    expiresIn(parseDuration(env.REFRESH_TOKEN_EXPIRES_IN));