import { LogType } from "@prisma/client";
import { Gpio } from "onoff";
import { config } from "./config.js";
import { DOOR_CLOSED, DOOR_OPEN, SEC_TO_MS } from "./constants.js";
import { accessLog, logger } from "./logger.js";
import { MockGpio } from "./mocks.js";
import { resetState, state } from "./state.js";

export const doorGpio = process.env.NODE_ENV === "development" ? new MockGpio() : new Gpio(config.doorGpioPin, "out");

let doorCloseTimeout: NodeJS.Timeout | null = null;

export function openDoor(): void {
    if (!state.loggedInUser) throw new Error("No user while opening door");
    if (doorCloseTimeout) {
        clearTimeout(doorCloseTimeout);
        doorCloseTimeout = null;
    }
    accessLog(LogType.DoorOpened, { fob: state.loggedInUser.id, name: state.loggedInUser.name });
    resetState();
    doorGpio.writeSync(DOOR_OPEN);
    doorCloseTimeout = setTimeout(() => {
        logger.debug("Closing the door");
        doorGpio.writeSync(DOOR_CLOSED);
    }, config.doorOpenTime * SEC_TO_MS);
}
