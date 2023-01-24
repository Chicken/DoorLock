import { DOOR_CLOSED, EXIT_NORMAL } from "./constants.js";
import { doorGpio } from "./door.js";
import { logger } from "./logger.js";
import { trySync } from "./util.js";

export function addExitHandlers(): void {
    process.on("SIGINT", () => process.exit(EXIT_NORMAL));
    process.on("SIGTERM", () => process.exit(EXIT_NORMAL));
    process.on("exit", (code) => {
        trySync(() => doorGpio.writeSync(DOOR_CLOSED), "Error closing door");
        trySync(() => doorGpio.unexport(), "Error unexporting gpio pin");

        if (code === EXIT_NORMAL) {
            logger.log("Shutting down normally...");
        } else {
            logger.error("Shutting down with error code", code);
        }
    });
}
