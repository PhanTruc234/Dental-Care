import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();
type ExpiresIn = SignOptions["expiresIn"];

const DEFAULT_CLIENT_URLS = ["http://localhost:5173"];

const normalizeUrl = (url: string): string => url.trim().replace(/\/$/, "");
const clientUrls = (process.env.CLIENT_URL ?? "").split(",").map(normalizeUrl).filter(Boolean);
const resolvedClientUrls = clientUrls.length ? clientUrls : DEFAULT_CLIENT_URLS;
const appUrl = normalizeUrl(process.env.APP_URL ?? "") || resolvedClientUrls[0]!;

export const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "3000",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    JWT_SECRET: process.env.JWT_SECRET || "1IoksWkM/Co7Gd2yiBbE8eV12qektRbZh5GRl1/Qe4Q=",
    JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || "15m") as ExpiresIn,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "0fpulpOlr33KBKKo1VijQeq5nVgyxKuGdeX2gJ4PpG0=",
    REFRESH_TOKEN_EXPIRES_IN: (process.env.REFRESH_TOKEN_EXPIRES_IN ||
        "7d") as ExpiresIn,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_SECRET: process.env.GOOGLE_SECRET || "",
    SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
    SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    SMTP_FROM: process.env.SMTP_FROM || "",
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "",
    APP_NAME: process.env.APP_NAME || "DentalCare",
    CLIENT_URLS: resolvedClientUrls,
    CLIENT_URL: appUrl,
    DATABASE_URL: process.env.DATABASE_URL,
};
