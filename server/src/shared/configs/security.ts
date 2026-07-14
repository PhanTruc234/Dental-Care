import cors from 'cors';
import helmet from "helmet";
import { env } from "./dotenv.js";

const allowedOrigins = (env.CLIENT_URL || "http://localhost:5173").split(",").map((origin) => origin.trim());
export const configureSecurity = (app: any) => {
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            },
            crossOriginEmbedderPolicy: false,
        })
    );
    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`Origin ${origin} not allowed by CORS`));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        })
    );
};