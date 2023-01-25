import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";

// TODO:
// - monorepo
// - solidjs frontend

// TODO:
// - trpc after all
// - login: localstorage, jwt
// - api: viewing logs, managing users
// - log streams: websockets, eventemitter3

export function startApiServer(): void {
    const app = express();

    app.listen(config.apiPort, config.apiHost, () => {
        logger.success(`API server listening on ${config.apiHost}:${config.apiPort}`);
    });

    app.get("/", (_req, res) => {
        res.send("Hello World!");
    });
}
