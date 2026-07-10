import { env } from "../configs/dotenv.js";

export const COOKIE_DEFAULTS = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};