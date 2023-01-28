import { QueryClient } from "@tanstack/solid-query";
import { createTRPCProxyClient, createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { createTRPCSolid } from "solid-trpc";
import type { AppRouter } from "../../server/src/api.js";

export const trpcQuery = createTRPCSolid<AppRouter>();

const trpcClientOptions = {
    links: [
        splitLink({
            condition: (op) => op.type === "subscription",
            true: wsLink({
                client: createWSClient({
                    url: `${window.location.protocol === "https:" ? "wss://" : "ws://"}${
                        window.location.host
                    }/api/trpc_ws`,
                }),
            }),
            false: httpBatchLink({
                url: "/api/trpc",
            }),
        }),
    ],
};

export const client = trpcQuery.createClient(trpcClientOptions);

export const queryClient = new QueryClient();

export const trpc = createTRPCProxyClient<AppRouter>(trpcClientOptions);
