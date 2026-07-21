import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { created, ok } from "../../shared/utils/response.js";
import { requestContext } from "../../shared/utils/request-context.js";
import type {
    CreateStaffBody, ListStaffQuery, StaffIdParams, UpdateStaffBody,
} from "./staff.schema.js";
import * as staffService from "./staff.service.js";

export const createStaff = handleAsync(
    async (req: Request<unknown, unknown, CreateStaffBody>, res: Response) => {
        const { message, staff } = await staffService.createStaff(
            req.user!.id, req.body, requestContext(req),
        );
        created(res, staff, message);
    },
);

export const listStaff = handleAsync(
    async (req: Request<unknown, unknown, unknown, ListStaffQuery>, res: Response) => {
        ok(res, await staffService.listStaff(req.query));
    },
);

export const getStaff = handleAsync(
    async (req: Request<StaffIdParams>, res: Response) => {
        ok(res, await staffService.getStaff(req.params));
    },
);

export const updateStaff = handleAsync(
    async (req: Request<StaffIdParams, unknown, UpdateStaffBody>, res: Response) => {
        const { message, staff } = await staffService.updateStaff(
            req.user!.id, req.params, req.body, requestContext(req),
        );
        ok(res, staff, message);
    },
);