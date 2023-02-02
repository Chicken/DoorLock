import type { KeyFob, Log } from ".prisma/client";
import { Icon } from "solid-heroicons";
import { eye, eyeSlash } from "solid-heroicons/solid";
import { Component, createEffect, createSignal, For, Setter, Show } from "solid-js";
import { trpc, trpcQuery } from "../api.js";

export const Dashboard: Component<{ login: Setter<boolean> }> = (props) => {
    const trpcUtils = trpcQuery.useContext();
    const keyFobs = trpcQuery.getFobs.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const [beingEdited, setBeingEdited] = createSignal<KeyFob | null>(null);
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
    const [showPin, setShowPin] = createSignal(false);

    const [tab, setTab] = createSignal<"fobs" | "logs">("fobs");

    const csrfToken = trpcQuery.getCsrfToken.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const [lastId, setLastId] = createSignal<number | null>(null);
    const [lastElement, setLastElement] = createSignal<Element | null>(null);

    const logs = trpcQuery.getLogs.useInfiniteQuery(() => ({ limit: 20 }), {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        onSuccess(data) {
            setLastId(data.pages.at(-1)!.entries.at(-1)!.id);
        },
        refetchOnWindowFocus: false,
    });

    let observer: IntersectionObserver | null = null;

    type TransferedLog = Omit<Log, "timestamp"> & { timestamp: number };

    createEffect(() => {
        if (observer) observer.disconnect();
        observer = null;
        observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (entry.isIntersecting) {
                logs.fetchNextPage();
            }
        });
        if (lastElement()) observer.observe(lastElement()!);
    });

    const [newLogs, setNewLogs] = createSignal<TransferedLog[]>([]);

    trpcQuery.newLogs.useSubscription(undefined, {
        onData: (data) => setNewLogs((old) => [data].concat(old)),
    });

    return (
        <Show
            when={csrfToken.data}
            fallback={
                <div class="w-full text-center">
                    <h1 class="mb -2font-semibold text-3xl">Loading...</h1>
                </div>
            }
        >
            <div class="relative max-h-screen text-center">
                <h1 class="mb-2 text-3xl font-semibold">Dashboard</h1>
                <button
                    class="absolute top-0 right-0 rounded bg-red-400 py-1 px-2"
                    onClick={async () => {
                        const data = await fetch("/api/logout").then((res) => res.json());
                        if (data.success) props.login(false);
                    }}
                >
                    Logout
                </button>
                <div class="grid grid-cols-2">
                    <button
                        class={`rounded-t py-2 px-4 font-medium text-white ${
                            tab() === "fobs" ? "bg-slate-400" : "bg-slate-500"
                        }`}
                        onClick={() => setTab("fobs")}
                    >
                        Fobs
                    </button>
                    <button
                        class={`rounded-t py-2 px-4 font-medium text-white ${
                            tab() === "logs" ? "bg-slate-400" : "bg-slate-500"
                        }`}
                        onClick={() => setTab("logs")}
                    >
                        Logs
                    </button>
                    {tab() === "fobs" ? (
                        <div class="col-span-2 rounded-b bg-slate-400">
                            <Show when={!keyFobs.isLoading && keyFobs.isSuccess} fallback={<p>Loading...</p>}>
                                <Show when={keyFobs.data?.length} fallback={<p>No fobs to be listed!</p>}>
                                    <For each={keyFobs.data?.sort((a, b) => (a.id > b.id ? 1 : -1))}>
                                        {(keyFob) => (
                                            <div class="m-1 grid grid-cols-9 items-center rounded bg-slate-400">
                                                {keyFob.enabled ? (
                                                    <span class="col-span-1 m-2 h-4 w-4 rounded-full bg-green-400" />
                                                ) : (
                                                    <span class="col-span-1 m-2 h-4 w-4 rounded-full bg-red-400" />
                                                )}
                                                <span class="col-span-4 m-1 mx-0 overflow-hidden text-left text-xl text-white">
                                                    {keyFob.name}
                                                </span>
                                                <button
                                                    class="col-span-2 m-1 rounded bg-blue-500 p-1 font-medium text-white"
                                                    onClick={async () => {
                                                        setBeingEdited(structuredClone(keyFob));
                                                    }}
                                                >
                                                    Modify
                                                </button>
                                                <button
                                                    class="col-span-2 m-1 rounded bg-red-500 p-1 font-medium text-white"
                                                    onClick={async () => {
                                                        await trpc.deleteFob.mutate({
                                                            id: keyFob.id,
                                                            csrf: csrfToken.data!,
                                                        });
                                                        trpcUtils.getFobs.invalidate();
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </For>
                                </Show>
                            </Show>
                        </div>
                    ) : (
                        <div class="overflow-x-hide col-span-2 max-h-[60vh]  overflow-y-scroll rounded-b bg-slate-400 p-2 text-xs text-white md:text-base">
                            <Show when={logs.data} fallback={<p>Loading...</p>}>
                                <div class="grid grid-cols-4 font-bold">
                                    <span>Time</span>
                                    <span>Type</span>
                                    <span>Fob</span>
                                    <span>Pin</span>
                                </div>
                                <For each={newLogs().concat(logs.data!.pages.map((p) => p.entries).flat())}>
                                    {(entry) => (
                                        <div
                                            class="grid grid-cols-4 font-semibold"
                                            ref={(el) => {
                                                if (entry.id === lastId()) setLastElement(el);
                                            }}
                                        >
                                            {(() => {
                                                const time = new Date(entry.timestamp);
                                                const known = keyFobs.data?.find((f) => f.id == entry.fob);
                                                return (
                                                    <>
                                                        <span>
                                                            {time.getDate().toString().padStart(2, "0")}/
                                                            {(time.getMonth() + 1).toString().padStart(2, "0")}
                                                            {" | "}
                                                            {time.getHours().toString().padStart(2, "0")}:
                                                            {time.getMinutes().toString().padStart(2, "0")}
                                                        </span>
                                                        <span>{entry.type.toString()}</span>
                                                        <span
                                                            class={
                                                                known ? "text-green-400" : "cursor-pointer text-red-600"
                                                            }
                                                            {...(known
                                                                ? {}
                                                                : {
                                                                      onClick: () => {
                                                                          setBeingEdited({
                                                                              id: entry.fob,
                                                                              name: "",
                                                                              pin: "",
                                                                              enabled: true,
                                                                          });
                                                                      },
                                                                  })}
                                                        >
                                                            {known?.name ?? entry.fob}
                                                        </span>
                                                        <span class=" text-red-600">{entry.pin}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </For>
                                <Show when={logs.isFetching}>
                                    <p class="text-xs font-semibold md:text-base">Loading...</p>
                                </Show>
                                <Show when={!logs.hasNextPage}>
                                    <p class="text-xs font-semibold md:text-base">Reached end of logs</p>
                                </Show>
                            </Show>
                        </div>
                    )}
                </div>
                <Show when={beingEdited()}>
                    <div class="fixed inset-0 overflow-y-auto">
                        <div
                            class="flex min-h-screen items-end justify-center bg-black bg-opacity-50 px-4 pt-4 pb-20 text-center sm:block sm:p-0"
                            onClick={(e) => {
                                if (e.target.isEqualNode(e.currentTarget)) {
                                    setBeingEdited(null);
                                    setShowPin(false);
                                }
                            }}
                        >
                            <span class="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                            <div class="relative inline-block transform overflow-hidden rounded-lg bg-white px-2 pt-3 pb-2 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 sm:align-middle">
                                <form
                                    class="grid grid-cols-[auto,1fr] items-center justify-items-end"
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (beingEdited()!.name.length < 1 || beingEdited()!.name.length > 128) {
                                            setErrorMessage("Name must be between 1 and 128 characters");
                                            return;
                                        }
                                        if (
                                            beingEdited()!.pin.length < 4 ||
                                            beingEdited()!.pin.length > 10 ||
                                            isNaN(+beingEdited()!.pin)
                                        ) {
                                            setErrorMessage("Pin must be between 4 and 10 numbers");
                                            return;
                                        }
                                        if (keyFobs.data!.find((f) => f.id === beingEdited()!.id)) {
                                            await trpc.updateFob.mutate({
                                                ...beingEdited()!,
                                                csrf: csrfToken.data!,
                                            });
                                        } else {
                                            await trpc.addFob.mutate({
                                                ...beingEdited()!,
                                                csrf: csrfToken.data!,
                                            });
                                        }
                                        trpcUtils.getFobs.invalidate();
                                        setBeingEdited(null);
                                        setShowPin(false);
                                    }}
                                >
                                    <label>Name</label>
                                    <input
                                        class="focus:shadow-outline m-3 w-auto rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
                                        placeholder="Name"
                                        value={beingEdited()!.name}
                                        onInput={(e) =>
                                            setBeingEdited((kf) => ({
                                                ...kf!,
                                                name: e.currentTarget.value,
                                            }))
                                        }
                                    />
                                    <label>Pin</label>
                                    <div class="relative">
                                        <input
                                            class="focus:shadow-outline m-3 w-auto rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
                                            type={showPin() ? "text" : "password"}
                                            placeholder=""
                                            value={beingEdited()!.pin}
                                            onInput={(e) =>
                                                setBeingEdited((kf) => ({
                                                    ...kf!,
                                                    pin: e.currentTarget.value,
                                                }))
                                            }
                                        />
                                        <div
                                            class="absolute inset-y-0 right-0 flex items-center pr-3 text-sm leading-5 text-gray-700"
                                            onClick={() => setShowPin((prev) => !prev)}
                                        >
                                            {showPin() ? (
                                                <Icon path={eye} class="mx-1 w-6" />
                                            ) : (
                                                <Icon path={eyeSlash} class="mx-1 w-6" />
                                            )}
                                        </div>
                                    </div>
                                    <label>Enabled</label>
                                    <div class="col-span-1 w-full text-left">
                                        <input
                                            class="m-3 rounded border p-2 shadow focus:ring-0"
                                            type="checkbox"
                                            checked={beingEdited()!.enabled}
                                            onInput={(e) =>
                                                setBeingEdited((kf) => ({
                                                    ...kf!,
                                                    enabled: e.currentTarget.checked,
                                                }))
                                            }
                                        />
                                    </div>
                                    <Show when={errorMessage}>
                                        <div class="col-span-full flex w-full justify-center">
                                            {errorMessage ? <p class="text-red-500">{errorMessage()}</p> : null}
                                        </div>
                                    </Show>
                                    <div class="col-span-full flex w-full justify-center">
                                        <button type="submit" class="rounded bg-blue-500 p-2 text-white">
                                            Save
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </Show>
            </div>
        </Show>
    );
};
