export type Role = "ADMIN" | "DENTIST" | "PATIENT" | "RECEPTIONIST" | "ASSISTANT";

export interface TokenPayload {
    id: string;
    role: Role;
    email: string;
}

export interface AccessTokenPayload extends TokenPayload {
    sid: string;
    iat: number;
}