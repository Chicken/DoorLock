import { DOOR_CLOSED, EXIT_ERROR, EXIT_NORMAL } from "./constants.js";
import { prisma } from "./db.js";
import { doorGpio } from "./door.js";
import { logger } from "./logger.js";
import { trySync } from "./util.js";

export function addExitHandlers(): void {
    process.on("SIGINT", () => process.exit(EXIT_NORMAL));
    process.on("SIGTERM", () => process.exit(EXIT_NORMAL));
    process.on("SIGUSR1", () => process.exit(EXIT_NORMAL));
    process.on("SIGUSR2", () => process.exit(EXIT_NORMAL));
    process.on("uncaughtException", (err) => {
        logger.error(`Uncaught exception\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
        process.exit(EXIT_ERROR);
    });
    process.on("beforeExit", async () => {
        try {
            await prisma.$disconnect();
        } catch (err) {
            logger.error(
                `Error disconnecting from database\n${err instanceof Error ? err.stack ?? err.message : String(err)}`
            );
        }
    });
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
