import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import * as authController from "./auth.controller.js";
import {
    ChangePasswordBody,
    ForgotPasswordBody,
    GoogleLoginBody,
    LoginBody,
    RegisterBody,
    ResendVerificationBody,
    ResetPasswordBody,
    SessionIdParams,
    VerifyEmailQuery,
} from "./auth.schema.js";
import { authLimiter, createLimiter, emailLimiter } from "../../shared/configs/rate-limit.js";

const router = Router();
router.post("/register", createLimiter, validate({ body: RegisterBody }), authController.register);
router.get("/verify-email", validate({ query: VerifyEmailQuery }), authController.verifyEmail);
router.post("/resend-verification", emailLimiter, validate({ body: ResendVerificationBody }), authController.resendVerification);
router.post("/login", authLimiter, validate({ body: LoginBody }), authController.login);
router.post("/google", validate({ body: GoogleLoginBody }), authController.googleLogin);

router.post("/forgot-password", emailLimiter, validate({ body: ForgotPasswordBody }), authController.forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: ResetPasswordBody }), authController.resetPassword);

router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

router.post("/change-password", authLimiter, verifyUser, validate({ body: ChangePasswordBody }), authController.changePassword);

router.get("/sessions", verifyUser, authController.getSessions);
router.post("/logout-all", verifyUser, authController.logoutAll);
router.delete("/sessions/:sessionId", verifyUser, validate({ params: SessionIdParams }), authController.revokeSession);

router.get("/me", verifyUser, authController.getMe);

export default router;
