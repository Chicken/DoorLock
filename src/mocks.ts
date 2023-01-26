import { createServer } from "http";
import type { BinaryValue } from "onoff";
import { logger } from "./logger.js";

export class MockGpio {
    constructor(...args: unknown[]) {
        logger.debug("MockGpio.constructor", ...args);
    }

    writeSync(value: BinaryValue): void {
        logger.debug("MockGpio.writeSync", value);
        return;
    }

    unexport(): void {
        logger.debug("MockGpio.unexport");
        return;
    }
}

export class MockSerial {
    private target?: NodeJS.WritableStream;
    constructor(...args: unknown[]) {
        logger.debug("MockSerial.constructor", ...args);
        if (!process.env.MOCK_CONTROL_PORT) throw new Error("Missing MOCK_CONTROL_PORT");
        if (!process.env.MOCK_CONTROL_PASSWORD) throw new Error("Missing MOCK_CONTROL_PASSWORD");
        createServer((req, res) => {
            if (req.url === "/" && req.method === "POST") {
                if (req.headers.authorization !== process.env.MOCK_CONTROL_PASSWORD) {
                    res.writeHead(401, { "Content-Type": "text/html" });
                    res.write("Unauthorized");
                    res.end();
                    return;
                }
                const data: Buffer[] = [];
                req.on("data", (chunk: Buffer) => data.push(chunk));
                req.on("end", () => {
                    const input = Buffer.concat(data).toString();
                    logger.debug("Mock request", input);
                    this.target?.write(`${input}\n`);
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.write("Done.");
                    res.end();
                    req.removeAllListeners();
                });
            } else {
                res.writeHead(404, { "Content-Type": "text/html" });
                res.write("Not found");
                res.end();
            }
        }).listen(parseInt(process.env.MOCK_CONTROL_PORT, 10), () => {
            logger.debug("Mock control server is listening on port", process.env.MOCK_CONTROL_PORT);
        });
    }

    pipe<TStream extends NodeJS.WritableStream>(dest: TStream): TStream {
        this.target = dest;
        return dest;
    }
}
