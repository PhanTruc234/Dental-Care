import { OAuth2Client } from "google-auth-library";
import { AuthProvider, Role } from "../../generated/prisma/enums.js";
import { env } from "../../shared/configs/dotenv.js";
import { logger } from "../../shared/configs/logger.js";
import { prisma } from "../../shared/configs/prisma.js";
import { sendNewDeviceLoginEmail, sendPasswordChangedEmail, sendResetPasswordEmail, sendVerificationEmail } from "../../shared/services/email.service.js";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../../shared/utils/AppError.js";
import { generateAccessToken, generateRandomToken, generateRefreshToken, hashToken, refreshTokenExpiry, verifyRefreshToken } from "../../shared/utils/token.js";
import type { ChangePasswordBody, ForgotPasswordBody, GoogleLoginBody, LoginBody, RegisterBody, ResendVerificationBody, ResetPasswordBody, SessionIdParams, VerifyEmailQuery } from "./auth.schema.js";
import { expiresIn } from "../../shared/utils/time.js";
import { comparePassword, hashPassword } from "../../shared/utils/password.js";
import { describeDevice } from "../../shared/utils/user-agent.js";
import { AuditAction, writeAudit } from "../../shared/services/audit.service.js";
import type { RequestContext } from "../../shared/utils/request-context.js";
import { withUniqueCodeRetry } from "../../shared/utils/unique-code.js";
const PATIENT_CODE_CONFLICT = "Không tạo được mã bệnh nhân, vui lòng thử lại";
type SessionContext = { userAgent?: string | null; ip?: string | null };
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const issueSession = async (
    user: { userId: string; email: string; role: Role },
    context: SessionContext = {},
) => {
    const payload = { id: user.userId, email: user.email, role: user.role };
    const refreshToken = generateRefreshToken(payload);
    const [priorCount, sameDevice] = await Promise.all([
        prisma.refreshToken.count({ where: { userId: user.userId } }),
        context.userAgent
            ? prisma.refreshToken.findFirst({
                where: { userId: user.userId, userAgent: context.userAgent },
            })
            : Promise.resolve(null),
    ]);
    const isNewDevice = priorCount > 0 && !sameDevice;

    const session = await prisma.refreshToken.create({
        data: {
            userId: user.userId,
            tokenHash: hashToken(refreshToken),
            expiresAt: refreshTokenExpiry(),
            userAgent: context.userAgent ?? null,
            ip: context.ip ?? null,
        },
    });

    const accessToken = generateAccessToken({ ...payload, sid: session.id });

    if (isNewDevice) {
        try {
            await sendNewDeviceLoginEmail(user.email, {
                userAgent: context.userAgent ?? "Không rõ",
                ip: context.ip ?? "Không rõ",
                time: new Date(),
            });
        } catch (err) {
            logger.error({ err, userId: user.userId }, "Gửi email cảnh báo thiết bị lạ thất bại");
        }
    }

    return { accessToken, refreshToken, user: payload };
};
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
export const register = async (data: RegisterBody, context: RequestContext = {}) => {
    const { email, fullName, password, phone } = data
    const existing = await prisma.user.findUnique({
        where: { email },
        select: { userId: true }
    })
    if (existing) {
        throw new ConflictError("Tài khoản đã tồn tại, vui lòng đăng nhập lại")
    }
    const passwordHash = await hashPassword(password)
    const verifyToken = generateRandomToken();
    const { user, patient } = await withUniqueCodeRetry("patient_code", PATIENT_CODE_CONFLICT, () =>
        prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    emailVerifyTokenHash: hashToken(verifyToken),
                    emailVerifyTokenExpires: expiresIn(EMAIL_VERIFY_TTL_MS),
                    role: Role.PATIENT,
                }
            })
            const count = await tx.patient.count();
            const patientCode = `BN${String(count + 1).padStart(6, "0")}`;
            const patient = await tx.patient.create({
                data: {
                    patientCode,
                    userId: user.userId,
                    fullName,
                    phone
                },
            });
            return { user, patient };
        })
    )
    await writeAudit({
        action: AuditAction.REGISTER,
        entity: "User",
        entityId: user.userId,
        userId: user.userId,
        newValue: { role: user.role, patientCode: patient.patientCode },
        context,
    });
    try {
        await sendVerificationEmail(user.email, verifyToken);
    } catch (err) {
        logger.error({ err, userId: user.userId }, "Gửi email xác thực thất bại");
    }
    return {
        message: "Đăng ký thành công, vui lòng kiểm tra email để xác thực",
        user: {
            id: user.userId,
            fullName: patient.fullName,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified
        },
    };
}
export const verifyEmail = async ({ token }: VerifyEmailQuery) => {
    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({
        where: {
            emailVerifyTokenHash: tokenHash,
            emailVerifyTokenExpires: {
                gt: new Date()
            }
        }
    });
    if (!user) {
        throw new BadRequestError("Token không hợp lệ hoặc đã hết hạn");
    }
    await prisma.user.update({
        where: {
            userId: user.userId
        },
        data: {
            emailVerified: true,
            emailVerifyTokenHash: null,
            emailVerifyTokenExpires: null
        }
    })
    return {
        message: "Xác nhận email thành công",
    }
}
export const resendVerification = async ({ email }: ResendVerificationBody) => {
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    })
    if (user && !user.emailVerified && user.isActive && !user.deletedAt) {
        const verifyToken = generateRandomToken();
        await prisma.user.update({
            where: {
                userId: user.userId
            },
            data: {
                emailVerifyTokenHash: hashToken(verifyToken),
                emailVerifyTokenExpires: expiresIn(EMAIL_VERIFY_TTL_MS)
            }
        })
        try {
            await sendVerificationEmail(user.email, verifyToken);
        } catch (err) {
            logger.error({ err, userId: user.userId }, "Gửi email xác thực thất bại");
        }
    }
    return {
        message: "Nếu email tồn tại và chưa được xác thực, bạn sẽ nhận được email xác nhận",
    }
}
export const login = async (data: LoginBody, context: RequestContext = {}) => {
    const { email, password } = data
    // Ghi email đã thử để phát hiện dò tài khoản. KHÔNG ghi mật khẩu.
    const auditFailure = (reason: string, userId?: string) =>
        writeAudit({
            action: AuditAction.LOGIN_FAILED,
            entity: "User",
            entityId: userId ?? null,
            userId: userId ?? null,
            newValue: { email, reason },
            context,
        });

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        await auditFailure("NO_ACCOUNT");
        throw new UnauthorizedError("Email hoặc mật khẩu không đúng");
    }
    if (!user.isActive || user.deletedAt) {
        await auditFailure("INACTIVE", user.userId);
        throw new UnauthorizedError("Tài khoản đã bị vô hiệu hoá");
    }
    if (!user.passwordHash) {
        throw new BadRequestError(
            "Tài khoản này sử dụng đăng nhập bằng Google. Vui lòng đăng nhập bằng Google."
        );
    }
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
        await auditFailure("WRONG_PASSWORD", user.userId);
        throw new UnauthorizedError("Email hoặc mật khẩu không đúng");
    }
    if (!user.emailVerified) {
        await auditFailure("EMAIL_NOT_VERIFIED", user.userId);
        throw new UnauthorizedError("Vui lòng xác nhận email trước khi đăng nhập");
    }
    const session = await issueSession(user, context);
    await writeAudit({
        action: AuditAction.LOGIN,
        entity: "User",
        entityId: user.userId,
        userId: user.userId,
        newValue: { provider: "LOCAL" },
        context,
    });
    return { message: "Đăng nhập thành công", ...session };
}
export const googleLogin = async ({ idToken }: GoogleLoginBody, context: RequestContext = {}) => {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
        throw new UnauthorizedError("Token Google không hợp lệ");
    }
    if (!payload.email_verified) {
        throw new UnauthorizedError("Email Google chưa được xác thực");
    }
    const { sub: googleId, email, name } = payload;
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        if (!user.isActive || user.deletedAt) {
            throw new UnauthorizedError("Tài khoản đã bị vô hiệu hoá");
        }
        if (user.providerId && user.providerId !== googleId) {
            throw new UnauthorizedError("Email này đã được liên kết với một tài khoản Google khác");
        }
        if (!user.providerId) {
            user = await prisma.user.update({
                where: { userId: user.userId },
                data: { providerId: googleId, emailVerified: true },
            });
        }
    } else {
        user = await withUniqueCodeRetry("patient_code", PATIENT_CODE_CONFLICT, () =>
            prisma.$transaction(async (tx) => {
                const created = await tx.user.create({
                    data: {
                        email,
                        authProvider: AuthProvider.GOOGLE,
                        providerId: googleId,
                        emailVerified: true,
                        role: Role.PATIENT,
                    },
                });
                const count = await tx.patient.count();
                const patientCode = `BN${String(count + 1).padStart(6, "0")}`;
                await tx.patient.create({
                    data: {
                        patientCode,
                        userId: created.userId,
                        fullName: name ?? email,
                    },
                });
                return created;
            })
        );
    }
    const session = await issueSession(user, context);
    await writeAudit({
        action: AuditAction.LOGIN,
        entity: "User",
        entityId: user.userId,
        userId: user.userId,
        newValue: { provider: "GOOGLE" },
        context,
    });
    return { message: "Đăng nhập Google thành công", ...session };
}
export const forgotPassword = async ({ email }: ForgotPasswordBody) => {
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if (user && user.isActive && !user.deletedAt && user.passwordHash) {
        const resetToken = generateRandomToken();
        await prisma.user.update({
            where: { userId: user.userId },
            data: {
                passwordResetTokenHash: hashToken(resetToken),
                passwordResetTokenExpires: expiresIn(PASSWORD_RESET_TTL_MS),
            },
        });
        try {
            await sendResetPasswordEmail(user.email, resetToken);
        } catch (err) {
            logger.error({ err, userId: user.userId }, "Gửi email đặt lại mật khẩu thất bại");
        }
    }
    return {
        message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu"
    };
}
export const resetPassword = async ({ token, newPassword }: ResetPasswordBody, context: RequestContext = {}) => {
    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({
        where: {
            passwordResetTokenHash: tokenHash,
            passwordResetTokenExpires: { gt: new Date() },
        },
    });
    if (!user) {
        throw new BadRequestError("Token không hợp lệ hoặc đã hết hạn");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
        prisma.user.update({
            where: { userId: user.userId },
            data: {
                passwordHash,
                passwordResetTokenHash: null,
                passwordResetTokenExpires: null,
                passwordChangedAt: new Date(),
            },
        }),
        prisma.refreshToken.updateMany({
            where: { userId: user.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
    ]);
    await writeAudit({
        action: AuditAction.PASSWORD_RESET,
        entity: "User",
        entityId: user.userId,
        userId: user.userId,
        context,
    });
    try {
        await sendPasswordChangedEmail(user.email);
    } catch (err) {
        logger.error({ err, userId: user.userId }, "Gửi email thông báo đặt lại mật khẩu thất bại");
    }
    return { message: "Đặt lại mật khẩu thành công" };
};
export const changePassword = async (userId: string, { newPassword, currentPassword }: ChangePasswordBody, context: RequestContext = {}) => {
    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) {
        throw new NotFoundError("Không tìm thấy người dùng");
    }
    if (!user.passwordHash) {
        throw new BadRequestError("Tài khoản Google không thể đổi mật khẩu bằng cách này");
    }
    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
        throw new UnauthorizedError("Mật khẩu hiện tại không đúng");
    }
    if (currentPassword === newPassword) {
        throw new BadRequestError("Mật khẩu mới phải khác mật khẩu hiện tại");
    }

    const passwordHash = await hashPassword(newPassword);
    const payload = { id: user.userId, email: user.email, role: user.role };
    const refreshToken = generateRefreshToken(payload);

    const [, , newSession] = await prisma.$transaction([
        prisma.user.update({ where: { userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
        prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
        prisma.refreshToken.create({
            data: {
                userId,
                tokenHash: hashToken(refreshToken),
                expiresAt: refreshTokenExpiry(),
                userAgent: context.userAgent ?? null,
                ip: context.ip ?? null,
            },
        }),
    ]);
    const accessToken = generateAccessToken({ ...payload, sid: newSession.id });
    await writeAudit({
        action: AuditAction.PASSWORD_CHANGED,
        entity: "User",
        entityId: userId,
        userId,
        context,
    });
    try {
        await sendPasswordChangedEmail(user.email);
    } catch (err) {
        logger.error({ err, userId }, "Gửi email thông báo đổi mật khẩu thất bại");
    }

    return { message: "Đổi mật khẩu thành công", accessToken, refreshToken };
};
export const refreshSession = async (token: string, context: RequestContext = {}) => {
    try {
        verifyRefreshToken(token);
    } catch {
        throw new UnauthorizedError("Refresh token không hợp lệ hoặc đã hết hạn");
    }

    const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(token) },
    });
    if (stored?.revokedAt) {
        await prisma.refreshToken.updateMany({
            where: { userId: stored.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        logger.warn({ userId: stored.userId }, "Phát hiện tái sử dụng refresh token — đã thu hồi toàn bộ phiên");
        await writeAudit({
            action: AuditAction.TOKEN_REUSE_DETECTED,
            entity: "User",
            entityId: stored.userId,
            userId: stored.userId,
            newValue: { revokedSessionId: stored.id },
            context,
        });
        throw new UnauthorizedError("Phát hiện tái sử dụng token, vui lòng đăng nhập lại");
    }
    if (!stored || stored.expiresAt < new Date()) {
        throw new UnauthorizedError("Refresh token không hợp lệ");
    }
    const user = await prisma.user.findUnique({ where: { userId: stored.userId } });
    if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedError("Tài khoản không hợp lệ");
    }

    const payload = { id: user.userId, email: user.email, role: user.role };
    const newRefreshToken = generateRefreshToken(payload);
    const [, newSession] = await prisma.$transaction([
        prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        }),
        prisma.refreshToken.create({
            data: {
                userId: user.userId,
                tokenHash: hashToken(newRefreshToken),
                expiresAt: refreshTokenExpiry(),
                userAgent: stored.userAgent,
                ip: stored.ip,
            },
        }),
    ]);
    const newAccessToken = generateAccessToken({ ...payload, sid: newSession.id });
    return {
        message: "Token đã được làm mới",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};
export const logout = async (token: string | undefined, context: RequestContext = {}) => {
    if (token) {
        const stored = await prisma.refreshToken.findUnique({
            where: { tokenHash: hashToken(token) },
            select: { id: true, userId: true, revokedAt: true },
        });
        await prisma.refreshToken.updateMany({
            where: { tokenHash: hashToken(token), revokedAt: null },
            data: { revokedAt: new Date() },
        });
        if (stored && !stored.revokedAt) {
            await writeAudit({
                action: AuditAction.LOGOUT,
                entity: "RefreshToken",
                entityId: stored.id,
                userId: stored.userId,
                context,
            });
        }
    }
    return { message: "Đăng xuất thành công" };
};
export const getSessions = async (userId: string, currentSid: string) => {
    const rows = await prisma.refreshToken.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, userAgent: true, ip: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    });
    return rows.map((s) => ({
        id: s.id,
        device: describeDevice(s.userAgent),
        ip: s.ip,
        loginAt: s.createdAt,
        current: s.id === currentSid,
    }));
};

export const logoutAll = async (userId: string, context: RequestContext = {}) => {
    const r = await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    await writeAudit({
        action: AuditAction.LOGOUT_ALL,
        entity: "User",
        entityId: userId,
        userId,
        newValue: { revokedCount: r.count },
        context,
    });
    return { message: "Đã đăng xuất khỏi mọi thiết bị" };
};

export const revokeSession = async (userId: string, { sessionId }: SessionIdParams, context: RequestContext = {}) => {
    const r = await prisma.refreshToken.updateMany({
        where: { id: sessionId, userId, revokedAt: null },   // userId chặn đá phiên người khác
        data: { revokedAt: new Date() },
    });
    if (r.count === 0) throw new NotFoundError("Không tìm thấy phiên");
    await writeAudit({
        action: AuditAction.SESSION_REVOKED,
        entity: "RefreshToken",
        entityId: sessionId,
        userId,
        context,
    });
    return { message: "Đã đăng xuất thiết bị" };
};
export const getMe = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { userId },
        include: {
            patient: {
                select: {
                    patientId: true,
                    fullName: true,
                    patientCode: true,
                    phone: true
                }
            },
            staff: {
                select: {
                    staffId: true,
                    fullName: true,
                    employeeCode: true,
                }
            },
        },
    });
    if (!user) {
        throw new NotFoundError("Không tìm thấy tài khoản");
    }
    return {
        id: user.userId,
        email: user.email,
        role: user.role,
        profile: user.patient ?? user.staff ?? null,
    };
};