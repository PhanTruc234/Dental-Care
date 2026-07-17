import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { BadRequestError } from "../utils/AppError.js";

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

export const validate =
    (schemas: Schemas): RequestHandler =>
        (req, _res, next) => {
            for (const key of ["body", "params", "query"] as const) {
                const schema = schemas[key];
                if (!schema) continue;

                const result = schema.safeParse(req[key]);
                if (!result.success) {
                    const msg = result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
                    return next(new BadRequestError(msg));
                }
                if (key === "body") {
                    req.body = result.data;
                }
                else {
                    Object.assign(req[key], result.data);
                }
            }
            next();
        };
