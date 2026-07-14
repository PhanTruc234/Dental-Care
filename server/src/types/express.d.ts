import { TokenPayload } from "../shared/types/auth.types.ts";

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload
        }
    }
}

export { };