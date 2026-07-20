import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { ok, created } from "../../shared/utils/response.js";
import { setAuthCookies, clearAuthCookies } from "../../shared/utils/token.js";
import { UnauthorizedError } from "../../shared/utils/AppError.js";
import type {
    ChangePasswordBody, ForgotPasswordBody, GoogleLoginBody, LoginBody,
    RegisterBody, ResendVerificationBody, ResetPasswordBody, SessionIdParams, VerifyEmailQuery,
} from "./auth.schema.js";
import * as authService from "./auth.service.js";
import { requestContext } from "../../shared/utils/request-context.js";
export const register = handleAsync(
    async (req: Request<unknown, unknown, RegisterBody>, res: Response) => {
        const { message, user } = await authService.register(req.body, requestContext(req));
        created(res, user, message);
    },
);

export const verifyEmail = handleAsync(
    async (req: Request<unknown, unknown, unknown, VerifyEmailQuery>, res: Response) => {
        const { message } = await authService.verifyEmail(req.query);
        ok(res, undefined, message);
    },
);

export const resendVerification = handleAsync(
    async (req: Request<unknown, unknown, ResendVerificationBody>, res: Response) => {
        const { message } = await authService.resendVerification(req.body);
        ok(res, undefined, message);
    },
);

export const login = handleAsync(
    async (req: Request<unknown, unknown, LoginBody>, res: Response) => {
        const { message, accessToken, refreshToken, user } = await authService.login(req.body, requestContext(req));
        setAuthCookies(res, accessToken, refreshToken);
        ok(res, { accessToken, user }, message);
    },
);

export const googleLogin = handleAsync(
    async (req: Request<unknown, unknown, GoogleLoginBody>, res: Response) => {
        const { message, accessToken, refreshToken, user } = await authService.googleLogin(req.body, requestContext(req));
        setAuthCookies(res, accessToken, refreshToken);
        ok(res, { accessToken, user }, message);
    },
);
export const forgotPassword = handleAsync(
    async (req: Request<unknown, unknown, ForgotPasswordBody>, res: Response) => {
        const { message } = await authService.forgotPassword(req.body);
        ok(res, undefined, message);
    },
);

export const resetPassword = handleAsync(
    async (req: Request<unknown, unknown, ResetPasswordBody>, res: Response) => {
        const { message } = await authService.resetPassword(req.body, requestContext(req));
        clearAuthCookies(res);
        ok(res, undefined, message);
    },
);

export const changePassword = handleAsync(
    async (req: Request<unknown, unknown, ChangePasswordBody>, res: Response) => {
        const { message, accessToken, refreshToken } = await authService.changePassword(req.user!.id, req.body, requestContext(req));
        setAuthCookies(res, accessToken, refreshToken);

        ok(res, { accessToken }, message);
    },
);
export const refreshToken = handleAsync(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
        throw new UnauthorizedError("Refresh token không tồn tại");
    }
    try {
        const { message, accessToken, refreshToken: newRt } = await authService.refreshSession(token, requestContext(req));
        setAuthCookies(res, accessToken, newRt);
        ok(res, { accessToken }, message);
    } catch (err) {
        clearAuthCookies(res);
        throw err;
    }
});

export const logout = handleAsync(async (req: Request, res: Response) => {
    const { message } = await authService.logout(req.cookies?.refreshToken as string | undefined, requestContext(req));
    clearAuthCookies(res);
    ok(res, undefined, message);
});

export const getSessions = handleAsync(async (req: Request, res: Response) => {
    const sessions = await authService.getSessions(req.user!.id, req.user!.sid);
    ok(res, sessions);
});

export const logoutAll = handleAsync(async (req: Request, res: Response) => {
    const { message } = await authService.logoutAll(req.user!.id, requestContext(req));
    clearAuthCookies(res);
    ok(res, undefined, message);
});

export const revokeSession = handleAsync(
    async (req: Request<SessionIdParams>, res: Response) => {
        const { message } = await authService.revokeSession(req.user!.id, req.params, requestContext(req));
        ok(res, undefined, message);
    },
);
export const getMe = handleAsync(async (req: Request, res: Response) => {
    const me = await authService.getMe(req.user!.id);
    ok(res, me);
});
