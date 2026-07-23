import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";
import "../../modules/auth/auth.docs.js";
import "../../modules/user/user.docs.js";
import "../../modules/staff/staff.docs.js";
import "../../modules/specialty/specialty.docs.js";
import "../../modules/service-category/service-category.docs.js";
import "../../modules/service/service.docs.js";
import "../../modules/manufacturer/manufacturer.docs.js";
import "../../modules/medicine/medicine.docs.js";
export function buildOpenApiDocument() {
    const generator = new OpenApiGeneratorV31(registry.definitions);
    return generator.generateDocument({
        openapi: "3.1.0",
        info: {
            title: "DentalCare API",
            version: "1.0.0",
            description: "API hệ thống quản lý phòng khám nha khoa",
        },
        servers: [{ url: "/" }],
    });
}
