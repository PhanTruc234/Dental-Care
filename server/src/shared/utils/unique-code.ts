import { Prisma } from "../../generated/prisma/client.js";
import { ConflictError } from "./AppError.js";

const MAX_RETRY = 5;
const isUniqueConflictOn = (err: unknown, column: string) => {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
        return false;
    }
    const target = err.meta?.target;
    if (Array.isArray(target)) return target.includes(column);
    if (typeof target === "string") return target.split(/[,\s]+/).includes(column);

    const match = /Unique constraint failed on the fields: \(([^)]*)\)/.exec(err.message);
    if (!match) return false;
    const fields = [...match[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    return fields.includes(column);
};

export const withUniqueCodeRetry = async <T>(
    column: string,
    conflictMessage: string,
    fn: () => Promise<T>,
): Promise<T> => {
    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (isUniqueConflictOn(err, column)) continue;
            throw err;
        }
    }
    throw new ConflictError(conflictMessage);
};
