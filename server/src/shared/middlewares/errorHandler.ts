import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError, UnauthorizedError } from "../utils/AppError.js";
import { env } from "../configs/dotenv.js";

const handleJWTError = () => new UnauthorizedError("Token không hợp lệ");
const handleJWTExpired = () => new UnauthorizedError("Token đã hết hạn");

interface ErrorResponse {
    status: "error";
    message: string;
    requestId?: string;
    stack?: string;
    rawMessage?: string;
}
export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next,) => {
    let error = err;
    if (err?.name === "JsonWebTokenError") {
        error = handleJWTError();
    }
    if (err?.name === "TokenExpiredError") {
        error = handleJWTExpired();
    }

    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : 500;
    const isOperational = isAppError && error.isOperational;
    if (isOperational) {
        req.log.warn({ statusCode, requestId: req.id }, error.message);
    } else {
        req.log.error(
            { err: error, statusCode, requestId: req.id },
            "Unhandled unexpected error",
        );
    }
    const response: ErrorResponse = {
        status: "error",
        message: isOperational ? error.message : "Lỗi server nội bộ",
        requestId: String(req.id),
    };
    if (env.NODE_ENV === "development") {
        response.stack = error.stack;
        if (!isOperational) {
            response.rawMessage = error.message;
        }
    }

    res.status(statusCode).json(response);
};
export const notFoundHandler: RequestHandler = (req, _res, _next) => {
    throw new AppError(
        `Không tìm thấy route: ${req.method} ${req.originalUrl}`,
        404,
    );
};
