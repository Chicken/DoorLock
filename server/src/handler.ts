import { LogType } from "@prisma/client";
import { config } from "./config.js";
import { SEC_TO_MS } from "./constants.js";
import { prisma } from "./db.js";
import { openDoor } from "./door.js";
import { accessLog, logger } from "./logger.js";
import { clearPinTimeout, LoginStage, resetState, state } from "./state.js";
import { isNightTime } from "./util.js";

const WINDOW_LENGTH = 60;
const WINDOW_SIZE = 10;

let runningCount = 0;
let ratelimit: NodeJS.Timeout | null = null;

export async function handleInput(data: string): Promise<void> {
    runningCount++;
    if (!ratelimit)
        setTimeout(() => {
            runningCount = 0;
            ratelimit = null;
        }, WINDOW_LENGTH * 1000);

    if (runningCount > WINDOW_SIZE) {
        logger.debug("Ratelimiting key input");
        return;
    }

    switch (state.loginStage) {
        case LoginStage.WaitingForFob:
            await handleFob(data);
            break;
        case LoginStage.WaitingForPin:
            handlePin(data);
            break;
    }
}

async function handleFob(fob: string): Promise<void> {
    const keyFob = await prisma.keyFob.findUnique({
        where: {
            id: fob,
        },
    });
    if (!keyFob) {
        accessLog(LogType.UnknownFob, { fob });
        return;
    }
    logger.debug("Detected fob for", keyFob.name);
    if (!keyFob.enabled) {
        accessLog(LogType.DisabledFob, { fob: keyFob.id, name: keyFob.name });
        return;
    }
    state.loggedInUser = keyFob;
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
        if (state.loggedInUser)
            accessLog(LogType.PinTimeout, { fob: state.loggedInUser.id, name: state.loggedInUser.name });
        resetState();
    }, config.pinTimeout * SEC_TO_MS);
}

function handlePin(data: string): void {
    clearPinTimeout();
    if (!state.loggedInUser) throw new Error("No user while waiting for pin");
    if (data !== state.loggedInUser.pin) {
        accessLog(LogType.IncorrectPin, { fob: state.loggedInUser.id, name: state.loggedInUser.name, pin: data });
        resetState();
        return;
    }
    logger.debug("Detected pin for", state.loggedInUser.name);
    openDoor();
}
