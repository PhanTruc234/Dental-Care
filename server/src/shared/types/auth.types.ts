export type Role = "ADMIN" | "DENTIST" | "PATIENT" | "RECEPTIONIST" | "ASSISTANT";

export type TokenPayload = {
    id: string;
    role: Role;
    email: string;
}

export type AccessTokenPayload = {
    sid: string;
    iat: number;
} & TokenPayload