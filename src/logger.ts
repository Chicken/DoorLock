import { LogType } from "@prisma/client";
import { blue, greenBright, redBright, yellow } from "colorette";
import { inspect } from "node:util";
import { prisma } from "./db.js";

const time = () => blue(`[${new Date().toLocaleString("en-gb")}]`);

const dataToString = (data: unknown[]) =>
    data
        .map((e) => (typeof e === "string" ? e : inspect(e)))
        .join(" ")
        .split("\n")
        .join(`\n${" ".repeat(23)}`);

export const logger = {
    log: (...data: unknown[]) => console.log(`${time()} ${dataToString(data)}`),
    success: (...data: unknown[]) => console.log(`${time()} ${greenBright(dataToString(data))}`),
    error: (...data: unknown[]) => console.error(`${time()} ${redBright(dataToString(data))}`),
    debug: (...data: unknown[]) =>
        process.env.NODE_ENV === "development" || process.env.LOG_LEVEL === "debug"
            ? console.log(`${time()} ${yellow(dataToString(data))}`)
            : void 0,
};

export type SubscriberFn = (data: { type: LogType; fob?: string; pin?: string }) => void;
const accessLogSubscribers = new Set<SubscriberFn>();

export function accessLogSubscribe(fn: SubscriberFn) {
    accessLogSubscribers.add(fn);
    return () => accessLogSubscribers.delete(fn);
}

export function accessLog(type: LogType, { fob, name, pin }: { fob?: string; name?: string; pin?: string }) {
    switch (type) {
        case LogType.UnknownFob:
            logger.log("Unknown fob", fob ?? "[unknown]");
            break;
        case LogType.DisabledFob:
            logger.log("Fob for", (fob ?? "[unknown]") + (name ? ` (${name})` : ""), "is disabled");
            break;
        case LogType.PinTimeout:
            logger.log("Timed out waiting for pin of", (fob ?? "[unknown]") + (name ? ` (${name})` : ""));
            break;
        case LogType.IncorrectPin:
            logger.log("Incorrect pin", pin ?? "[unknown]", "for", (fob ?? "[unknown]") + (name ? ` (${name})` : ""));
            break;
        case LogType.DoorOpened:
            logger.success("Door opened for", (fob ?? "[unknown]") + (name ? ` (${name})` : ""));
            break;
        default:
            throw new Error("Unhandled log type case");
    }

    prisma.log
        .create({
            data: {
                type,
                fob,
                pin,
            },
        })
        .catch((err) => {
            logger.error(`Error saving access logs\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
        });

    accessLogSubscribers.forEach((fn) => fn({ type, fob, pin }));
}
