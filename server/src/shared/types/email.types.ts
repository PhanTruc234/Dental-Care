/** A fully rendered email, ready to hand to the transport. */
export interface EmailTemplate {
    subject: string;
    html: string;
    /** Plain-text alternative. Always send one: it lifts deliverability and
     *  is what screen readers and text-only clients fall back to. */
    text: string;
}

export interface SendEmailOptions extends EmailTemplate {
    to: string | string[];
    replyTo?: string;
}

export interface EmailButton {
    label: string;
    url: string;
    /** Background colour, hex. Defaults to the brand primary. */
    color?: string;
}

export interface EmailLayoutOptions {
    /** Shown in the client's tab/title and used as the <h1>. */
    heading: string;
    /** Preview snippet shown next to the subject in the inbox list. */
    preheader: string;
    /** Paragraphs rendered above the call to action. Escaped by the caller. */
    paragraphs: string[];
    button?: EmailButton;
    /** Muted paragraphs rendered below the call to action. */
    footnotes?: string[];
    /** Rendered as a highlighted callout. Use for security warnings. */
    alert?: string;
}
