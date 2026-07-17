
export interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

export interface SendEmailOptions extends EmailTemplate {
    to: string | string[];
    replyTo?: string;
}

export interface EmailButton {
    label: string;
    url: string;
    color?: string;
}

export interface EmailLayoutOptions {
    heading: string;
    preheader: string;
    paragraphs: string[];
    button?: EmailButton;
    footnotes?: string[];
    alert?: string;
}

export interface NewDeviceLoginInfo {
    userAgent: string;
    ip: string;
    time: Date;
}
