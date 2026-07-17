import { z } from "./zod.js";

export const ErrorResponse = z.object({
    status: z.literal("error"),
    message: z.string().openapi({ example: "Token đã hết hạn" }),
    requestId: z.string().openapi({ example: "req-abc123" })
}).openapi("ErrorResponse")