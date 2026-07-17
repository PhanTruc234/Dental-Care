import { UAParser } from "ua-parser-js";

export const describeDevice = (userAgent?: string | null): string => {
    if (!userAgent) return "Thiết bị không xác định";
    const { browser, os } = new UAParser(userAgent).getResult();
    const browserLabel = browser.name
        ? `${browser.name}${browser.version ? ` ${browser.version.split(".")[0]}` : ""}`
        : "";
    const osLabel = os.name ? `${os.name}${os.version ? ` ${os.version}` : ""}` : "";
    if (browserLabel && osLabel) return `${browserLabel} trên ${osLabel}`;
    return browserLabel || osLabel || "Thiết bị không xác định";
};