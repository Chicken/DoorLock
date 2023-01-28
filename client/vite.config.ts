import dotenv from "dotenv";
import fs from "node:fs";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

const serverConfig = (() => {
    try {
        return dotenv.parse(fs.readFileSync("../server/.env", "utf-8"));
    } catch {
        return {};
    }
})();

export default defineConfig({
    plugins: [solidPlugin()],
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: `http://localhost:${serverConfig.API_PORT ?? 8080}/`,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
            "/api/trpc_ws": {
                target: `ws://localhost:${serverConfig.API_PORT_WS ?? 8081}/`,
                rewrite: (path) => path.replace(/^\/api\/trpc_ws/, ""),
                ws: true,
            },
        },
    },
    build: {
        target: "esnext",
    },
});
