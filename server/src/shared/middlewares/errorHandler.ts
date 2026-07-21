import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../utils/AppError.js";
import { env } from "../configs/dotenv.js";

const handleJWTError = () => new UnauthorizedError("Token không hợp lệ");
const handleJWTExpired = () => new UnauthorizedError("Token đã hết hạn");

/**
 * Với @prisma/adapter-pg (Prisma 7), err.meta.target là UNDEFINED - tên cột chỉ
 * nằm trong message: "Unique constraint failed on the fields: (`phone`)".
 * Đọc meta.target trước để tương thích driver khác, rồi rơi về parse message.
 */
const conflictFields = (err: Prisma.PrismaClientKnownRequestError): string[] => {
    const target = err.meta?.target;
    if (Array.isArray(target)) return target.map(String);
    if (typeof target === "string") return [target];

    const match = /Unique constraint failed on the fields: \(([^)]*)\)/.exec(err.message);
    if (!match) return [];
    return [...match[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
};

/**
 * Map lỗi Prisma sang AppError một lần cho toàn hệ thống, thay vì bắt thủ công
 * từng cột @unique ở mọi service. Không có nó thì trùng SĐT/CCCD trả về 500.
 */
const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError) => {
    switch (err.code) {
        case "P2002": {
            const fields = conflictFields(err);
            return new ConflictError(
                fields.length
                    ? `Giá trị đã tồn tại ở: ${fields.join(", ")}`
                    : "Dữ liệu đã tồn tại",
            );
        }
        case "P2025":
            return new NotFoundError("Không tìm thấy bản ghi");
        case "P2003":
            return new BadRequestError("Dữ liệu tham chiếu không hợp lệ");
        default:
            return null;
    }
};

type ErrorResponse = {
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
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        error = handlePrismaError(err) ?? err;
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
