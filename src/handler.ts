import { config } from "./config.js";
import { SEC_TO_MS } from "./constants.js";
import { openDoor } from "./door.js";
import { logger } from "./logger.js";
import { clearPinTimeout, LoginStage, resetState, state } from "./state.js";
import { isNightTime } from "./util.js";

export function handleInput(data: string): void {
    switch (state.loginStage) {
        case LoginStage.WaitingForFob:
            handleFob(data);
            break;
        case LoginStage.WaitingForPin:
            handlePin(data);
            break;
    }
}

function handleFob(fob: string): void {
    if (!config.keyFobs.has(fob)) {
        logger.log("Unknown fob", fob);
        return;
    }
    const user = config.keyFobs.get(fob)!;
    logger.debug("Detected fob for", user.name);
    state.loggedInUser = user;
    if (isNightTime()) {
        logger.debug("It is night time, waiting for pin");
        state.loginStage = LoginStage.WaitingForPin;
        setPinTimeout();
    } else {
        openDoor();
    }
}

function setPinTimeout(): void {
    clearPinTimeout();
    state.pinTimeout = setTimeout(() => {
        logger.debug("Timed out waiting for pin");
        resetState();
    }, config.pinTimeout * SEC_TO_MS);
}

function handlePin(data: string): void {
    clearPinTimeout();
    if (!state.loggedInUser) throw new Error("No user while waiting for pin");
    if (data !== state.loggedInUser.pin) {
        logger.log("Incorrect pin", data, "for", state.loggedInUser.name);
        resetState();
        return;
    }
    logger.debug("Detected pin for", state.loggedInUser.name);
    openDoor();
}
