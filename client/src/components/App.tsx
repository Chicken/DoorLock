import { Navigate, Route, Routes } from "@solidjs/router";
import { Component, createSignal, onMount, Show } from "solid-js";
import { trpc } from "../api.js";
import { Dashboard } from "./Dashboard.jsx";
import { Login } from "./Login.jsx";
import { NotFound } from "./NotFound.jsx";

export const App: Component = () => {
    const [loggedIn, setLoggedIn] = createSignal<boolean | null>(null);
    onMount(() => {
        trpc.loggedIn.query().then((data) => setLoggedIn(data));
    });
    return (
        <div class="flex min-h-screen items-center justify-center bg-slate-200">
            <div class="w-full max-w-lg">
                <div class="rounded-lg bg-slate-300 p-6 shadow">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <Show when={loggedIn() != null}>
                                    <Show when={loggedIn()} fallback={<Navigate href="/login" />}>
                                        <Navigate href="/dashboard" />
                                    </Show>
                                </Show>
                            }
                        />
                        <Route
                            path="/login"
                            element={
                                <Show when={loggedIn() != null}>
                                    <Show when={!loggedIn()} fallback={<Navigate href="/dashboard" />}>
                                        <Login login={setLoggedIn} />
                                    </Show>
                                </Show>
                            }
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <Show when={loggedIn() != null}>
                                    <Show when={loggedIn()} fallback={<Navigate href="/login" />}>
                                        <Dashboard login={setLoggedIn} />
                                    </Show>
                                </Show>
                            }
                        />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};
