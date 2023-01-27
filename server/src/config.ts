import { EXIT_CONFIG } from "./constants.js";
import { logger } from "./logger.js";

const requiredKeys = [
    "SERIAL_DEVICE",
    "SERIAL_BAUD",
    "DOOR_GPIO_PIN",
    "DOOR_OPEN_TIME",
    "PIN_TIMEOUT",
    "NIGHT_PERIOD_START",
    "NIGHT_PERIOD_END",
    "API_PORT",
    "API_PORT_WS",
    "ADMIN_PASSWORD",
    "JWT_SECRET",
    "DATABASE_URL",
] as const;
const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(EXIT_CONFIG);
}

export const config = {
    serialDevice: process.env.SERIAL_DEVICE!,
    serialBaud: parseInt(process.env.SERIAL_BAUD!, 10),
    doorGpioPin: parseInt(process.env.DOOR_GPIO_PIN!, 10),
    doorOpenTime: parseInt(process.env.DOOR_OPEN_TIME!, 10),
    pinTimeout: parseInt(process.env.PIN_TIMEOUT!, 10),
    nightPeriodStart: parseInt(process.env.NIGHT_PERIOD_START!, 10),
    nightPeriodEnd: parseInt(process.env.NIGHT_PERIOD_END!, 10),
    apiPort: parseInt(process.env.API_PORT!, 10),
    apiPortWs: parseInt(process.env.API_PORT_WS!, 10),
    adminPassword: process.env.ADMIN_PASSWORD!,
    jwtSecret: process.env.JWT_SECRET!,
} as const;
