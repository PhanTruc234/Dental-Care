import type { Request, Response } from "express";
import { handleAsync } from "../../shared/utils/handleAsync.js";
import { ok } from "../../shared/utils/response.js";
import { requestContext } from "../../shared/utils/request-context.js";
import type { ListUsersQuery, UpdateUserRoleBody, UpdateUserStatusBody, UserIdParams, } from "./user.schema.js";
import * as userService from "./user.service.js";

export const listUsers = handleAsync(
    async (req: Request<unknown, unknown, unknown, ListUsersQuery>, res: Response) => {
        ok(res, await userService.listUsers(req.query));
    },
);

export const getUser = handleAsync(
    async (req: Request<UserIdParams>, res: Response) => {
        ok(res, await userService.getUser(req.params));
    },
);

export const setUserStatus = handleAsync(
    async (req: Request<UserIdParams, unknown, UpdateUserStatusBody>, res: Response) => {
        const { message } = await userService.setUserStatus(
            req.user!.id, req.params, req.body, requestContext(req),
        );
        ok(res, undefined, message);
    },
);

export const setUserRole = handleAsync(
    async (req: Request<UserIdParams, unknown, UpdateUserRoleBody>, res: Response) => {
        const { message } = await userService.setUserRole(
            req.user!.id, req.params, req.body, requestContext(req),
        );
        ok(res, undefined, message);
    },
);