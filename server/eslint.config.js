import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
    // 1. Bỏ qua các thư mục không cần lint
    {
        ignores: ["dist", "node_modules"],
    },

    // 2. Bộ rule khuyến nghị của JS + TypeScript
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // 3. Cấu hình riêng cho code trong src
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node, // process, console, __dirname... khỏi báo "undefined"
            },
        },
        rules: {
            // Cho phép biến/tham số bắt đầu bằng _ (vd: _next, _req) không bị cảnh báo
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            // Nhắc dùng logger thay vì console (nhưng chỉ cảnh báo, không chặn)
            "no-console": "warn",
        },
    },

    // 4. PHẢI để cuối: tắt mọi rule format của ESLint xung đột với Prettier
    eslintConfigPrettier,
);
