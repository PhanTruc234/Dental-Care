import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { created, ok } from "../../shared/utils/response.js";
import { requestContext } from "../../shared/utils/request-context.js";
import type {
    CreateServiceBody, ListServicesQuery, ServiceIdParams, UpdateServiceBody,
} from "./service.schema.js";
import * as svc from "./service.service.js";

export const listServices = handleAsync(
    async (req: Request<unknown, unknown, unknown, ListServicesQuery>, res: Response) => {
        ok(res, await svc.listServices(req.query));
    },
);

export const getService = handleAsync(
    async (req: Request<ServiceIdParams>, res: Response) => {
        ok(res, await svc.getService(req.params));
    },
);

export const createService = handleAsync(
    async (req: Request<unknown, unknown, CreateServiceBody>, res: Response) => {
        const { message, service } = await svc.createService(req.user!.id, req.body, requestContext(req));
        created(res, service, message);
    },
);

export const updateService = handleAsync(
    async (req: Request<ServiceIdParams, unknown, UpdateServiceBody>, res: Response) => {
        const { message, service } = await svc.updateService(req.user!.id, req.params, req.body, requestContext(req));
        ok(res, service, message);
    },
);