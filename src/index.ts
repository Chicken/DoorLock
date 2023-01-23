import { addExitHandlers } from "./exitHandler.js";
import { startSerialListener } from "./serial.js";
import { logger } from "./logger.js";
import { startApiServer } from "./api.js";

addExitHandlers();

startSerialListener();

startApiServer();

logger.success("Started up!");
