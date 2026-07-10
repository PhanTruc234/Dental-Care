import { env } from "../../configs/dotenv.js";
import type { EmailButton, EmailLayoutOptions } from "../../types/email.types.js";

export const BRAND = {
    primary: "#4F46E5",
    danger: "#DC2626",
    text: "#1F2937",
    muted: "#6B7280",
    faint: "#9CA3AF",
    border: "#E5E7EB",
    canvas: "#F3F4F6",
    surface: "#FFFFFF",
} as const;

const FONT_STACK =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const renderButton = ({ label, url, color = BRAND.primary }: EmailButton): string => {
    const href = escapeHtml(url);
    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px auto">
            <tr>
                <td align="center" bgcolor="${color}" style="border-radius:8px">
                    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT_STACK};font-size:16px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:8px;mso-padding-alt:0">
                        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%;mso-text-raise:26px">&nbsp;</i><![endif]-->
                        <span style="mso-text-raise:13px">${escapeHtml(label)}</span>
                        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                    </a>
                </td>
            </tr>
        </table>`;
};

export const renderLayout = ({
    heading,
    preheader,
    paragraphs,
    button,
    footnotes = [],
    alert,
}: EmailLayoutOptions): string => {
    const appName = escapeHtml(env.APP_NAME);
    const year = new Date().getFullYear();

    const body = paragraphs
        .map(
            (text) =>
                `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${BRAND.text}">${text}</p>`,
        )
        .join("");

    const alertBlock = alert
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0">
                <tr>
                    <td style="padding:14px 16px;background:#FEF2F2;border-left:4px solid ${BRAND.danger};border-radius:4px">
                        <p style="margin:0;font-size:14px;line-height:22px;color:#991B1B;font-weight:600">${alert}</p>
                    </td>
                </tr>
            </table>`
        : "";

    const footnoteBlock = footnotes
        .map(
            (text) =>
                `<p style="margin:0 0 8px;font-size:14px;line-height:22px;color:${BRAND.muted}">${text}</p>`,
        )
        .join("");
    const previewPadding = "&#847;&zwnj;&nbsp;".repeat(60);

    return `<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background:${BRAND.canvas}">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.canvas};opacity:0">${escapeHtml(preheader)}${previewPadding}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.canvas}">
        <tr>
            <td align="center" style="padding:32px 12px">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px">
                    <tr>
                        <td align="center" style="padding:0 0 20px">
                            <span style="font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:-0.2px;color:${BRAND.primary}">${appName}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;font-family:${FONT_STACK}">
                            <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:700;color:${BRAND.text}">${escapeHtml(heading)}</h1>
                            ${body}
                            ${button ? renderButton(button) : ""}
                            ${alertBlock}
                            ${footnoteBlock}
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:24px 16px 0;font-family:${FONT_STACK}">
                            <p style="margin:0;font-size:12px;line-height:20px;color:${BRAND.faint}">
                                Email này được gửi tự động, vui lòng không trả lời.
                            </p>
                            <p style="margin:8px 0 0;font-size:12px;line-height:20px;color:${BRAND.faint}">
                                &copy; ${year} ${appName}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

export const renderText = (lines: string[]): string =>
    `${lines.join("\n")}\n\n— ${env.APP_NAME}\n`;
