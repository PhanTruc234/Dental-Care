import { z } from "./zod.js";

export const envelope = <T extends z.ZodTypeAny>(data: T, name: string) =>
    z.object({
        message: z.string().openapi({ example: "Success" }),
        data,
    }).openapi(name);
