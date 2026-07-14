export type Role = "admin" | "dentist" | "patient" | "receptionist" | "assistant";

export interface TokenPayload {
    id: string;
    role: Role;
    name: string;
    email: string;
}