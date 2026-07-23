import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { created, ok } from "../../shared/utils/response.js";
import type {
    CreateManufacturerBody, ListManufacturersQuery,
    ManufacturerIdParams, UpdateManufacturerBody,
} from "./manufacturer.schema.js";
import * as svc from "./manufacturer.service.js";

export const listManufacturers = handleAsync(
    async (req: Request<unknown, unknown, unknown, ListManufacturersQuery>, res: Response) => {
        ok(res, await svc.listManufacturers(req.query));
    },
);
export const createManufacturer = handleAsync(
    async (req: Request<unknown, unknown, CreateManufacturerBody>, res: Response) => {
        const { message, manufacturer } = await svc.createManufacturer(req.body);
        created(res, manufacturer, message);
    },
);
export const updateManufacturer = handleAsync(
    async (req: Request<ManufacturerIdParams, unknown, UpdateManufacturerBody>, res: Response) => {
        const { message, manufacturer } = await svc.updateManufacturer(req.params, req.body);
        ok(res, manufacturer, message);
    },
);
export const deleteManufacturer = handleAsync(
    async (req: Request<ManufacturerIdParams>, res: Response) => {
        const { message } = await svc.deleteManufacturer(req.params);
        ok(res, undefined, message);
    },
);