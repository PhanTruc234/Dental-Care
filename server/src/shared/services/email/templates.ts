import { env } from "../../configs/dotenv.js";
import type { EmailTemplate } from "../../types/email.types.js";
import { BRAND, renderLayout, renderText } from "./layout.js";

const buildUrl = (path: string, token: string): string =>
    `${env.CLIENT_URL}${path}?token=${encodeURIComponent(token)}`;

export const verificationEmail = (token: string): EmailTemplate => {
    const url = buildUrl("/verify-email", token);

    return {
        subject: `[${env.APP_NAME}] Xác nhận email của bạn`,
        html: renderLayout({
            heading: "Xác nhận địa chỉ email",
            preheader: `Xác nhận email để kích hoạt tài khoản ${env.APP_NAME} của bạn.`,
            paragraphs: [
                "Cảm ơn bạn đã đăng ký tài khoản.",
                "Nhấn nút bên dưới để xác nhận địa chỉ email và bắt đầu đặt lịch khám.",
            ],
            button: { label: "Xác nhận email", url },
            footnotes: [
                "Liên kết xác nhận sẽ hết hạn sau <strong>24 giờ</strong>.",
                "Nếu bạn không tạo tài khoản, hãy bỏ qua email này.",
            ],
        }),
        text: renderText([
            "Xác nhận địa chỉ email",
            "",
            "Cảm ơn bạn đã đăng ký tài khoản.",
            "Mở đường dẫn sau để xác nhận địa chỉ email của bạn:",
            url,
            "",
            "Liên kết sẽ hết hạn sau 24 giờ.",
            "Nếu bạn không tạo tài khoản, hãy bỏ qua email này.",
        ]),
    };
};

export const resetPasswordEmail = (token: string): EmailTemplate => {
    const url = buildUrl("/reset-password", token);

    return {
        subject: `[${env.APP_NAME}] Đặt lại mật khẩu`,
        html: renderLayout({
            heading: "Đặt lại mật khẩu",
            preheader: `Yêu cầu đặt lại mật khẩu cho tài khoản ${env.APP_NAME}.`,
            paragraphs: [
                "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
                "Nhấn nút bên dưới để chọn mật khẩu mới.",
            ],
            button: { label: "Đặt lại mật khẩu", url, color: BRAND.danger },
            footnotes: [
                "Liên kết sẽ hết hạn sau <strong>1 giờ</strong> và chỉ dùng được một lần.",
                "Nếu bạn không yêu cầu đặt lại mật khẩu, mật khẩu hiện tại vẫn an toàn và bạn có thể bỏ qua email này.",
            ],
        }),
        text: renderText([
            "Đặt lại mật khẩu",
            "",
            "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
            "Mở đường dẫn sau để chọn mật khẩu mới:",
            url,
            "",
            "Liên kết sẽ hết hạn sau 1 giờ và chỉ dùng được một lần.",
            "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.",
        ]),
    };
};

export const passwordChangedEmail = (): EmailTemplate => ({
    subject: `[${env.APP_NAME}] Mật khẩu đã được thay đổi`,
    html: renderLayout({
        heading: "Mật khẩu đã được thay đổi",
        preheader: "Mật khẩu tài khoản của bạn vừa được cập nhật.",
        paragraphs: [
            "Mật khẩu tài khoản của bạn vừa được thay đổi thành công.",
            "Bạn sẽ cần dùng mật khẩu mới cho những lần đăng nhập tiếp theo.",
        ],
        alert: "Nếu bạn không thực hiện thay đổi này, hãy liên hệ bộ phận hỗ trợ ngay lập tức.",
    }),
    text: renderText([
        "Mật khẩu đã được thay đổi",
        "",
        "Mật khẩu tài khoản của bạn vừa được thay đổi thành công.",
        "Bạn sẽ cần dùng mật khẩu mới cho những lần đăng nhập tiếp theo.",
        "",
        "Nếu bạn không thực hiện thay đổi này, hãy liên hệ bộ phận hỗ trợ ngay lập tức.",
    ]),
});
