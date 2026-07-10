import { NextFunction, Request, RequestHandler, Response } from "express";

export const handleAsync =
    // `any` là cố ý: khớp đúng default generic mà Express dùng cho
    // Request/RequestHandler. Đổi sang unknown sẽ vỡ kiểu khi gán vào route.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
            fn: (
                req: Request<P, ResBody, ReqBody, ReqQuery>,
                res: Response<ResBody>,
                next: NextFunction,
            ) => Promise<unknown>,
        ): RequestHandler<P, ResBody, ReqBody, ReqQuery> =>
        (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
