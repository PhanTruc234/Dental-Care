import type { IncomingHttpHeaders } from "node:http";

export type RequestContext = { userAgent?: string | null; ip?: string | null };

/**
 * Nhận kiểu cấu trúc thay vì express Request để không vướng generic
 * của Request<Params, ResBody, ReqBody> ở các controller đã khai báo kiểu body.
 */
type ContextSource = {
    headers: IncomingHttpHeaders;
    ip?: string | undefined;
};

export const requestContext = (req: ContextSource): RequestContext => ({
    userAgent: req.headers["user-agent"] ?? null,
    ip: req.ip ?? null,
});
