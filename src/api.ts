import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import type { NodeHTTPCreateContextFnOptions } from "@trpc/server/dist/adapters/node-http/types.js";
import { observable } from "@trpc/server/observable";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import ws, { WebSocketServer } from "ws";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { accessLogSubscribe, SubscriberFn } from "./logger.js";

// TODO:
// - monorepo: turborepo
// - frontend: solidjs
// - mutations: managing users

export type AppRouter = typeof appRouter;

const t = initTRPC.context<inferAsyncReturnType<typeof createContext>>().create();
const publicProcedure = t.procedure;
const middleware = t.middleware;
const router = t.router;

const withAuth = middleware(({ next, ctx }) => {
    if (ctx.authenticated) return next();
    throw new TRPCError({ code: "UNAUTHORIZED" });
});

const protectedProcedure = t.procedure.use(withAuth);

const appRouter = router({
    login: publicProcedure.input(z.object({ password: z.string() })).query(async ({ input: { password } }) => {
        // TODO: ratelimit logging in
        if (timingSafeEqual(Buffer.from(password), Buffer.from(config.adminPassword)))
            return {
                token: jwt.sign({}, config.jwtSecret, { expiresIn: "28d" }),
            };
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }),
    getFobs: protectedProcedure.query(async () => {
        return await prisma.keyFob.findMany();
    }),
    getLogs: protectedProcedure
        .input(
            z.object({
                limit: z.number().int().min(1).max(250).optional().default(100),
                cursor: z.number().int().min(0).optional(),
            })
        )
        .query(async ({ input: { limit, cursor } }) => {
            const entries = await prisma.log.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: {
                    id: "desc",
                },
            });
            let nextCursor: typeof cursor | undefined = undefined;
            if (entries.length > limit) {
                const nextItem = entries.pop();
                nextCursor = nextItem!.id;
            }
            return {
                entries,
                nextCursor,
            };
        }),
    newLogs: protectedProcedure.subscription(() => {
        return observable<Parameters<SubscriberFn>[0]>((emit) => {
            return accessLogSubscribe((data) => emit.next(data));
        });
    }),
});

async function createContext(
    opts:
        | NodeHTTPCreateContextFnOptions<IncomingMessage, ServerResponse<IncomingMessage>>
        | NodeHTTPCreateContextFnOptions<IncomingMessage, ws>
) {
    const [scheme, token] = opts.req.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer") return { authenticated: false };
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (typeof decoded === "string") throw new Error("JWT is of wrong type");
        if (decoded.iat! * 1000 < Date.now() && decoded.exp! * 1000 > Date.now()) return { authenticated: true };
        else return { authenticated: false };
    } catch {
        return { authenticated: false };
    }
}

createHTTPServer({
    router: appRouter,
    createContext,
}).listen(config.apiPort);

export const wss = new WebSocketServer({ port: config.apiPortWs });

export const wshandler = applyWSSHandler({
    router: appRouter,
    wss,
    createContext,
});
