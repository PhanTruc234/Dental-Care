export type Role = "admin" | "dentist" | "patient";

export interface TokenPayload {
    id: string;
    role: Role;
    name: string;
    email: string;
}