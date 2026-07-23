import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { created, ok } from "../../shared/utils/response.js";
import type {
    CreateServiceCategoryBody, ListServiceCategoriesQuery,
    ServiceCategoryIdParams, UpdateServiceCategoryBody,
} from "./service-category.schema.js";
import * as svc from "./service-category.service.js";

export const listServiceCategories = handleAsync(
    async (req: Request<unknown, unknown, unknown, ListServiceCategoriesQuery>, res: Response) => {
        ok(res, await svc.listServiceCategories(req.query));
    },
);

export const createServiceCategory = handleAsync(
    async (req: Request<unknown, unknown, CreateServiceCategoryBody>, res: Response) => {
        const { message, category } = await svc.createServiceCategory(req.body);
        created(res, category, message);
    },
);

export const updateServiceCategory = handleAsync(
    async (req: Request<ServiceCategoryIdParams, unknown, UpdateServiceCategoryBody>, res: Response) => {
        const { message, category } = await svc.updateServiceCategory(req.params, req.body);
        ok(res, category, message);
    },
);

export const deleteServiceCategory = handleAsync(
    async (req: Request<ServiceCategoryIdParams>, res: Response) => {
        const { message } = await svc.deleteServiceCategory(req.params);
        ok(res, undefined, message);
    },
);