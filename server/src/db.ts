import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

export const prisma = new PrismaClient();

function clearExpiredSessions() {
    prisma.session
        .deleteMany({
            where: {
                expires: {
                    lte: new Date(),
                },
            },
        })
        .catch((err) => {
            logger.error(
                `Error clearing expired sessions\n${err instanceof Error ? err.stack ?? err.message : String(err)}`
            );
        });
}

process.nextTick(clearExpiredSessions);
setInterval(clearExpiredSessions, 24 * 60 * 60 * 1000);
