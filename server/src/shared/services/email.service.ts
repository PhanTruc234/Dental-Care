import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../configs/dotenv.js";
import { logger } from "../configs/logger.js";
import type { NewDeviceLoginInfo, SendEmailOptions } from "../types/email.types.js";
import {
    newDeviceLoginEmail,
    passwordChangedEmail,
    resetPasswordEmail,
    verificationEmail,
} from "./email/templates.js";

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
    if (transporter) return transporter;
    if (!env.SMTP_USER || !env.SMTP_PASS) return null;

    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });

    return transporter;
};

const resolveFrom = (): string => {
    const from = env.SMTP_FROM || env.SMTP_USER;
    return from.includes("<") ? from : `"${env.APP_NAME}" <${from}>`;
};

export const sendEmail = async ({
    to,
    subject,
    html,
    text,
    replyTo,
}: SendEmailOptions): Promise<void> => {
    const transport = getTransporter();

    if (!transport) {
        logger.warn({ to, subject }, "SMTP not configured — email skipped");
        return;
    }

    try {
        const info = await transport.sendMail({
            from: resolveFrom(),
            to,
            subject,
            html,
            text,
            replyTo: replyTo || env.SUPPORT_EMAIL || undefined,
        });

        logger.info({ to, subject, messageId: info.messageId }, "Đã gửi email thành công");
    } catch (error) {
        logger.error({ err: error, to, subject }, "Lỗi khi gửi email");
        throw error;
    }
};

export const sendVerificationEmail = async (email: string, token: string,): Promise<void> => sendEmail({ to: email, ...verificationEmail(token) });

export const sendResetPasswordEmail = async (email: string, token: string): Promise<void> => sendEmail({ to: email, ...resetPasswordEmail(token) });

export const sendPasswordChangedEmail = async (email: string): Promise<void> =>
    sendEmail({ to: email, ...passwordChangedEmail() });

export const sendNewDeviceLoginEmail = async (
    email: string,
    info: NewDeviceLoginInfo,
): Promise<void> => sendEmail({ to: email, ...newDeviceLoginEmail(info) });
