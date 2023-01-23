import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";

// TODO: api (one admin user, viewing logs, adding users, configuring settings)
// TODO: initial setup via web
// TODO: react frontend

export function startApiServer(): void {
    const app = express();

    app.listen(config.apiPort, config.apiHost, () => {
        logger.success(`API server listening on ${config.apiHost}:${config.apiPort}`);
    });

    app.get("/", (_req, res) => {
        res.send("Hello World!");
    });
}
