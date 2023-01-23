import { Gpio } from "onoff";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { resetState, state } from "./state.js";
import { SEC_TO_MS } from "./util.js";

export const DOOR_OPEN = Gpio.HIGH;
export const DOOR_CLOSED = Gpio.LOW;

export const doorGpio = new Gpio(config.doorGpioPin, "out");

let doorCloseTimeout: NodeJS.Timeout | null = null;

export function openDoor(): void {
    if (!state.loggedInUser) throw new Error("No user while opening door");
    if (doorCloseTimeout) {
        clearTimeout(doorCloseTimeout);
        doorCloseTimeout = null;
    }
    logger.success("Opening the door for", state.loggedInUser.name);
    resetState();
    doorGpio.writeSync(DOOR_OPEN);
    doorCloseTimeout = setTimeout(() => {
        logger.debug("Closing the door");
        doorGpio.writeSync(DOOR_CLOSED)
    }, config.doorOpenTime * SEC_TO_MS);
}
