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

    parser.on("data", async (data) => {
        logger.debug("Received data:", data);
        const trimmed = data.trim();
        if (!trimmed) return;
        if (data.length > 16 || /[^0-9]/.test(trimmed)) {
            logger.error("Invalid data received:", data);
            return;
        }
        try {
            await handleInput(trimmed);
        } catch (err) {
            logger.error(`Error handling input:\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
            resetState();
            clearPinTimeout();
        }
    });
}
