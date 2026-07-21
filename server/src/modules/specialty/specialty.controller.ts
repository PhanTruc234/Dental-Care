import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { created, ok } from "../../shared/utils/response.js";
import type {
    CreateSpecialtyBody, ListSpecialtiesQuery, SpecialtyIdParams, UpdateSpecialtyBody,
} from "./specialty.schema.js";
import * as specialtyService from "./specialty.service.js";

export const listSpecialties = handleAsync(
    async (req: Request<unknown, unknown, unknown, ListSpecialtiesQuery>, res: Response) => {
        ok(res, await specialtyService.listSpecialties(req.query));
    },
);

export const createSpecialty = handleAsync(
    async (req: Request<unknown, unknown, CreateSpecialtyBody>, res: Response) => {
        const { message, specialty } = await specialtyService.createSpecialty(req.body);
        created(res, specialty, message);
    },
);

export const updateSpecialty = handleAsync(
    async (req: Request<SpecialtyIdParams, unknown, UpdateSpecialtyBody>, res: Response) => {
        const { message, specialty } = await specialtyService.updateSpecialty(req.params, req.body);
        ok(res, specialty, message);
    },
);

export const deleteSpecialty = handleAsync(
    async (req: Request<SpecialtyIdParams>, res: Response) => {
        const { message } = await specialtyService.deleteSpecialty(req.params);
        ok(res, undefined, message);
    },
);