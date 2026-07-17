import type { Response } from "express";

export const ok = <T>(res: Response, data?: T, message = "Success") =>
    res.status(200).json({
        message,
        data,
    });

export const created = <T>(res: Response, data?: T, message = "Created") =>
    res.status(201).json({
        message,
        data,
    });

export const noContent = (res: Response) =>
    res.sendStatus(204);

export const accepted = <T>(res: Response, data?: T, message = "Accepted") =>
    res.status(202).json({
        message,
        data,
    });