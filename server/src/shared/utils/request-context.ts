import type { IncomingHttpHeaders } from "node:http";

export type RequestContext = { userAgent?: string | null; ip?: string | null };
type ContextSource = {
    headers: IncomingHttpHeaders;
    ip?: string | undefined;
};

export const requestContext = (req: ContextSource): RequestContext => ({
    userAgent: req.headers["user-agent"] ?? null,
    ip: req.ip ?? null,
});
