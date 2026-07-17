import { AccessTokenPayload } from "../shared/types/auth.types.ts";

declare global {
    namespace Express {
        interface Request {
            user?: AccessTokenPayload
        }
    }
}

export { };