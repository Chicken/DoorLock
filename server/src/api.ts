import type { Log } from "@prisma/client";
import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import { CreateExpressContextOptions, createExpressMiddleware } from "@trpc/server/adapters/express";
import { applyWSSHandler, CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
import { observable } from "@trpc/server/observable";
import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { randomBytes } from "node:crypto";
import timeSafeCompare from "tsscmp";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { accessLogSubscribe, logger } from "./logger.js";

export type AppRouter = typeof appRouter;

const t = initTRPC.context<inferAsyncReturnType<typeof createContext>>().create();
const middleware = t.middleware;
const router = t.router;

const withAuth = middleware(({ next, ctx }) => {
    if (ctx.authenticated) return next();
    throw new TRPCError({ code: "UNAUTHORIZED" });
});

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(withAuth);

const appRouter = router({
    loggedIn: publicProcedure.query(async ({ ctx }) => {
        return ctx.authenticated;
    }),
    // we don't need csrf for login as this is a single user system
    getCsrfToken: protectedProcedure.query(async ({ ctx }) => {
        return ctx.session!.csrf;
    }),
    getFobs: protectedProcedure.query(async () => {
        return await prisma.keyFob.findMany();
    }),
    addFob: protectedProcedure
        .input(
            z
                .object({
                    id: z.string().min(1).max(10).regex(/^\d+$/),
                    name: z.string().min(1).max(128),
                    pin: z.string().min(1).max(10).regex(/^\d+$/),
                    enabled: z.boolean().optional(),
                    csrf: z
                        .string()
                        .length(64)
                        .regex(/^[a-f0-9]+$/),
                })
                .strict()
        )
        .mutation(async ({ input, ctx }) => {
            if (input.csrf !== ctx.session!.csrf) throw new TRPCError({ code: "UNAUTHORIZED" });
            const existing = await prisma.keyFob.findUnique({
                where: {
                    id: input.id,
                },
            });
            if (existing) throw new TRPCError({ code: "CONFLICT" });
            const fob = await prisma.keyFob.create({
                data: {
                    id: input.id,
                    name: input.name,
                    pin: input.pin,
                    enabled: input.enabled,
                },
            });
            return fob;
        }),
    deleteFob: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1).max(10).regex(/^\d+$/),
                csrf: z
                    .string()
                    .length(64)
                    .regex(/^[a-f0-9]+$/),
            })
        )
        .mutation(async ({ input, ctx }) => {
            if (input.csrf !== ctx.session!.csrf) throw new TRPCError({ code: "UNAUTHORIZED" });
            const existing = await prisma.keyFob.findUnique({
                where: {
                    id: input.id,
                },
            });
            if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
            const fob = await prisma.keyFob.delete({
                where: {
                    id: input.id,
                },
            });
            return fob;
        }),
    updateFob: protectedProcedure
        .input(
            z
                .object({
                    id: z.string().min(1).max(10).regex(/^\d+$/),
                    name: z.string().min(1).max(128).optional(),
                    pin: z.string().min(1).max(10).regex(/^\d+$/).optional(),
                    enabled: z.boolean().optional(),
                    csrf: z
                        .string()
                        .length(64)
                        .regex(/^[a-f0-9]+$/),
                })
                .strict()
        )
        .mutation(async ({ input, ctx }) => {
            if (input.csrf !== ctx.session!.csrf) throw new TRPCError({ code: "UNAUTHORIZED" });
            const existing = await prisma.keyFob.findUnique({
                where: {
                    id: input.id,
                },
            });
            if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
            const fob = await prisma.keyFob.update({
                where: {
                    id: input.id,
                },
                data: {
                    name: input.name,
                    pin: input.pin,
                    enabled: input.enabled,
                },
            });
            return fob;
        }),
    getLogs: protectedProcedure
        .input(
            z
                .object({
                    limit: z.number().int().min(1).max(250).optional().default(100),
                    cursor: z.number().int().min(0).optional(),
                })
                .strict()
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
                const nextItem = entries.pop()!;
                nextCursor = nextItem.id;
            }
            return {
                entries: entries.map((e) => ({ ...e, timestamp: e.timestamp.getTime() })),
                nextCursor,
            };
        }),
    newLogs: protectedProcedure.subscription(() => {
        return observable<Omit<Log, "timestamp"> & { timestamp: number }>((emit) => {
            return accessLogSubscribe((data) => emit.next({ ...data, timestamp: data.timestamp.getTime() }));
        });
    }),
});

async function createContext(opts: CreateExpressContextOptions | CreateWSSContextFnOptions) {
    const cookieHeader = opts.req.headers.cookie;
    if (!cookieHeader) return { authenticated: false };
    const cookies = Object.fromEntries(
        cookieHeader
            .split("; ")
            .map((c) => c.split("="))
            .map(([k, ...v]) => [k, v.join("=")])
    );
    const session = cookies.session;
    if (!session) return { authenticated: false };
    const sessionData = await prisma.session.findUnique({
        where: {
            token: session,
        },
    });
    if (!sessionData || sessionData.expires.getTime() < Date.now()) return { authenticated: false };
    return { authenticated: true, session: sessionData };
}

const app = express();
app.use(express.json());
app.use(cookieParser());

const loginSchema = z
    .object({
        password: z.string().max(128),
    })
    .strict();

app.post(
    "/login",
    rateLimit({
        windowMs: 60 * 1000,
        max: 5,
        message: { success: false, error: "Too many login attempts, please try again later" },
        standardHeaders: true,
        legacyHeaders: false,
    }),
    async (req, res) => {
        try {
            const parsed = await loginSchema.safeParseAsync(req.body);
            if (!parsed.success) {
                res.status(400).json({ success: false, error: "Invalid request" });
                return;
            }
            const { password } = parsed.data;
            if (!timeSafeCompare(password, config.adminPassword)) {
                res.status(401).json({ success: false, error: "Invalid password" });
                return;
            }
            const token = randomBytes(32).toString("hex");
            const csrf = randomBytes(32).toString("hex");
            await prisma.session.create({
                data: {
                    token,
                    csrf,
                    expires: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
                },
            });
            res.status(200)
                .cookie("session", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== "development",
                    sameSite: "strict",
                    maxAge: 28 * 24 * 60 * 60 * 1000,
                })
                .json({ success: true });
        } catch (err) {
            logger.error(`Error handling a login\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
        }
    }
);

app.get("/logout", async (req, res) => {
    if (!req.cookies.session) res.status(401).json({ success: false });
    await prisma.session.delete({
        where: {
            token: req.cookies.session,
        },
    });
    res.status(200).clearCookie("session").json({ success: true });
});

app.use(
    "/trpc",
    createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);

app.listen(config.apiPort);

export const wss = new WebSocketServer({ port: config.apiPortWs });

export const wshandler = applyWSSHandler({
    router: appRouter,
    wss,
    createContext,
});
