import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { created, ok } from "../../shared/utils/response.js";
import { requestContext } from "../../shared/utils/request-context.js";
import type {
    CreateMedicineBody, ListMedicinesQuery, MedicineIdParams, UpdateMedicineBody,
} from "./medicine.schema.js";
import * as svc from "./medicine.service.js";

export const listMedicines = handleAsync(
    async (req: Request<unknown, unknown, unknown, ListMedicinesQuery>, res: Response) => {
        ok(res, await svc.listMedicines(req.query));
    },
);
export const getMedicine = handleAsync(
    async (req: Request<MedicineIdParams>, res: Response) => {
        ok(res, await svc.getMedicine(req.params));
    },
);
export const createMedicine = handleAsync(
    async (req: Request<unknown, unknown, CreateMedicineBody>, res: Response) => {
        const { message, medicine } = await svc.createMedicine(req.user!.id, req.body, requestContext(req));
        created(res, medicine, message);
    },
);
export const updateMedicine = handleAsync(
    async (req: Request<MedicineIdParams, unknown, UpdateMedicineBody>, res: Response) => {
        const { message, medicine } = await svc.updateMedicine(req.user!.id, req.params, req.body, requestContext(req));
        ok(res, medicine, message);
    },
);