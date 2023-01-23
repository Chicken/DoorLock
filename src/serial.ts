import { ReadlineParser, SerialPort } from "serialport";
import { config } from "./config.js";
import { handleInput } from "./handler.js";
import { logger } from "./logger.js";
import { clearPinTimeout, resetState } from "./state.js";

export function startSerialListener(): void {
    const serial = new SerialPort({
        path: config.serialDevice,
        baudRate: config.serialBaud,
    });

    const parser = serial.pipe(new ReadlineParser());

    parser.on("data", (data) => {
        logger.debug("Received data:", data);
        const trimmed = data.trim();
        if (!trimmed) return;
        try {
            handleInput(data.trim());
        } catch (err) {
            logger.error(`Error handling input:\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
            resetState();
            clearPinTimeout();
        }
    });
}
