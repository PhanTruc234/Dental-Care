
export type EmailTemplate = {
    subject: string;
    html: string;
    text: string;
}

export type SendEmailOptions = {
    to: string | string[];
    replyTo?: string;
} & EmailTemplate

export type EmailButton = {
    label: string;
    url: string;
    color?: string;
}

export type EmailLayoutOptions = {
    heading: string;
    preheader: string;
    paragraphs: string[];
    button?: EmailButton;
    footnotes?: string[];
    alert?: string;
}

export type NewDeviceLoginInfo = {
    userAgent: string;
    ip: string;
    time: Date;
}
