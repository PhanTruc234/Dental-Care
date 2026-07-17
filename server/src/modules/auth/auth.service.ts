import { OAuth2Client } from "google-auth-library";
import { AuthProvider, Role } from "../../generated/prisma/enums.js";
import { env } from "../../shared/configs/dotenv.js";
import { logger } from "../../shared/configs/logger.js";
import { prisma } from "../../shared/configs/prisma.js";
import { sendNewDeviceLoginEmail, sendPasswordChangedEmail, sendResetPasswordEmail, sendVerificationEmail } from "../../shared/services/email.service.js";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../../shared/utils/AppError.js";
import { generateAccessToken, generateRandomToken, generateRefreshToken, hashToken, refreshTokenExpiry, verifyRefreshToken } from "../../shared/utils/token.js";
import type { ChangePasswordBody, ForgotPasswordBody, GoogleLoginBody, LoginBody, RegisterBody, ResendVerificationBody, ResetPasswordBody, SessionIdParams, VerifyEmailQuery } from "./auth.schema.js";
import { TokenPayload } from "../../shared/types/auth.types.js";
import { expiresIn } from "../../shared/utils/time.js";
import { comparePassword, hashPassword } from "../../shared/utils/password.js";
import { describeDevice } from "../../shared/utils/user-agent.js";
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
export const register = async (data: RegisterBody) => {
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
    const { user, patient } = await prisma.$transaction(async (tx) => {
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
    if (!user) {
        throw new NotFoundError("Không tìm thấy tài khoản với email này");
    }
    if (user.emailVerified) {
        throw new BadRequestError("Email đã được xác nhận");
    }
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
    return {
        message: "Email xác nhận đã được gửi lại",
    }
}
export const login = async (data: LoginBody, context: { userAgent?: string | null; ip?: string | null } = {}) => {
    const { email, password } = data
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        throw new UnauthorizedError("Email hoặc mật khẩu không đúng");
    }
    if (!user.isActive || user.deletedAt) {
        throw new UnauthorizedError("Tài khoản đã bị vô hiệu hoá");
    }
    if (!user.passwordHash) {
        throw new BadRequestError(
            "Tài khoản này sử dụng đăng nhập bằng Google. Vui lòng đăng nhập bằng Google."
        );
    }
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
        throw new UnauthorizedError("Email hoặc mật khẩu không đúng");
    }
    if (!user.emailVerified) {
        throw new UnauthorizedError("Vui lòng xác nhận email trước khi đăng nhập");
    }
    return { message: "Đăng nhập thành công", ...(await issueSession(user, context)) };
}
export const googleLogin = async ({ idToken }: GoogleLoginBody, context: { userAgent?: string | null; ip?: string | null } = {}) => {
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
        if (!user.providerId) {
            user = await prisma.user.update({
                where: { userId: user.userId },
                data: { providerId: googleId, emailVerified: true },
            });
        }
    } else {
        user = await prisma.$transaction(async (tx) => {
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
        });
    }
    return { message: "Đăng nhập Google thành công", ...(await issueSession(user, context)) };
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
export const resetPassword = async ({ token, newPassword }: ResetPasswordBody) => {
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
    try {
        await sendPasswordChangedEmail(user.email);
    } catch (err) {
        logger.error({ err, userId: user.userId }, "Gửi email thông báo đặt lại mật khẩu thất bại");
    }
    return { message: "Đặt lại mật khẩu thành công" };
};
export const changePassword = async (userId: string, { newPassword, currentPassword }: ChangePasswordBody, context: { userAgent?: string | null; ip?: string | null } = {}) => {
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
    try {
        await sendPasswordChangedEmail(user.email);
    } catch (err) {
        logger.error({ err, userId }, "Gửi email thông báo đổi mật khẩu thất bại");
    }

    return { message: "Đổi mật khẩu thành công", accessToken, refreshToken };
};
export const refreshSession = async (token: string) => {
    try {
        verifyRefreshToken(token) as TokenPayload;
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
        throw new UnauthorizedError("Phát hiện tái sử dụng token, vui lòng đăng nhập lại");
    }
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
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
export const logout = async (token: string | undefined) => {
    if (token) {
        await prisma.refreshToken.updateMany({
            where: { tokenHash: hashToken(token), revokedAt: null },
            data: { revokedAt: new Date() },
        });
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

export const logoutAll = async (userId: string) => {
    await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    return { message: "Đã đăng xuất khỏi mọi thiết bị" };
};

export const revokeSession = async (userId: string, { sessionId }: SessionIdParams) => {
    const r = await prisma.refreshToken.updateMany({
        where: { id: sessionId, userId, revokedAt: null },   // userId chặn đá phiên người khác
        data: { revokedAt: new Date() },
    });
    if (r.count === 0) throw new NotFoundError("Không tìm thấy phiên");
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