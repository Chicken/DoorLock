import { config } from "./config.js";
import { logger } from "./logger.js";

export const SEC_TO_MS = 1000;

export function isNightTime(): boolean {
    const currentHour = new Date().getHours();
    if (config.nightPeriodStart > config.nightPeriodEnd)
        return currentHour >= config.nightPeriodStart || currentHour < config.nightPeriodEnd;
    else return currentHour >= config.nightPeriodStart && currentHour < config.nightPeriodEnd;
}

export function trySync<T>(func: (...args: unknown[]) => T, errMsg: string): T | null {
    try {
        return func();
    } catch (err) {
        logger.error(`${errMsg}\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
        return null;
    }
}
