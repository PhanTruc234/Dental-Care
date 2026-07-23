import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import {
    CreateMedicineBody, ListMedicinesQuery, MedicineIdParams,
    MedicineListResponse, MedicineResponse, UpdateMedicineBody,
} from "./medicine.schema.js";

const json = <T extends z.ZodTypeAny>(s: T) => ({ content: { "application/json": { schema: s } } });
const res = <T extends z.ZodTypeAny>(d: string, s: T) => ({ description: d, ...json(s) });
const err = (d: string) => ({ description: d, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };
const guarded = { 401: err("Chưa đăng nhập"), 403: err("Không đủ quyền") };

registry.registerPath({
    method: "get", path: "/api/v1/medicines", tags: ["Medicines"],
    summary: "Danh sách thuốc",
    description: "Phân trang. Lọc `manufacturerId`, `unit`, `isActive`; tìm theo tên/mã. Tồn kho quản lý ở GĐ 6 (MedicineBatch).",
    ...secured, request: { query: ListMedicinesQuery },
    responses: { 200: res("OK", MedicineListResponse), ...guarded },
});
registry.registerPath({
    method: "get", path: "/api/v1/medicines/{medicineId}", tags: ["Medicines"],
    summary: "Chi tiết thuốc", ...secured, request: { params: MedicineIdParams },
    responses: { 200: res("OK", MedicineResponse), ...guarded, 404: err("Không tìm thấy") },
});
registry.registerPath({
    method: "post", path: "/api/v1/medicines", tags: ["Medicines"],
    summary: "Tạo thuốc (ADMIN)",
    description: "Mã `MEDxxxx` tự sinh. `sellingPrice` là giá bán hiện tại; giá chốt nằm ở snapshot khi kê đơn/bán.",
    ...secured, request: { body: json(CreateMedicineBody) },
    responses: { 201: res("Đã tạo", MedicineResponse), 400: err("Nhà sản xuất không tồn tại"), ...guarded },
});
registry.registerPath({
    method: "patch", path: "/api/v1/medicines/{medicineId}", tags: ["Medicines"],
    summary: "Cập nhật thuốc / bật-tắt isActive (ADMIN)",
    description: "Không xoá cứng — hoá đơn cũ còn tham chiếu.",
    ...secured, request: { params: MedicineIdParams, body: json(UpdateMedicineBody) },
    responses: { 200: res("Đã cập nhật", MedicineResponse), 400: err("Dữ liệu không hợp lệ"), ...guarded, 404: err("Không tìm thấy") },
});