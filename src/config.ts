import { EXIT_CONFIG } from "./constants.js";
import { logger } from "./logger.js";

const requiredKeys = [
    "SERIAL_DEVICE",
    "SERIAL_BAUD",
    "DOOR_GPIO_PIN",
    "DOOR_OPEN_TIME",
    "KEY_FOBS",
    "KEY_NAMES",
    "PIN_CODES",
    "PIN_TIMEOUT",
    "NIGHT_PERIOD_START",
    "NIGHT_PERIOD_END",
    "API_PORT",
] as const;
const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(EXIT_CONFIG);
}

const keyFobs = process.env.KEY_FOBS!.split(",");
const keyNames = process.env.KEY_NAMES!.split(",");
const pinCodes = process.env.PIN_CODES!.split(",");

if (keyFobs.length !== keyNames.length || keyFobs.length !== pinCodes.length) {
    logger.error("KEY_FOBS, KEY_NAMES, and PIN_CODES must have the same number of elements");
    process.exit(EXIT_CONFIG);
}

export interface User {
    name: string;
    pin: string;
}

export const config = {
    serialDevice: process.env.SERIAL_DEVICE!,
    serialBaud: parseInt(process.env.SERIAL_BAUD!, 10),
    doorGpioPin: parseInt(process.env.DOOR_GPIO_PIN!, 10),
    doorOpenTime: parseInt(process.env.DOOR_OPEN_TIME!, 10),
    keyFobs: new Map<string, User>(
        keyFobs.map((fob, index) => [
            fob,
            {
                name: keyNames[index],
                pin: pinCodes[index],
            },
        ])
    ),
    pinTimeout: parseInt(process.env.PIN_TIMEOUT!, 10),
    nightPeriodStart: parseInt(process.env.NIGHT_PERIOD_START!, 10),
    nightPeriodEnd: parseInt(process.env.NIGHT_PERIOD_END!, 10),
    apiPort: parseInt(process.env.API_PORT!, 10),
    apiHost: process.env.API_HOST || "0.0.0.0",
} as const;
