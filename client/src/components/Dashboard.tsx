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
                    <h1 class="text-3xl mb -2font-semibold">Loading...</h1>
                </div>
            }
        >
            <div class="text-center max-h-screen relative">
                <h1 class="text-3xl mb-2 font-semibold">Dashboard</h1>
                <button
                    class="bg-red-400 py-1 px-2 rounded absolute top-0 right-0"
                    onClick={() => {
                        fetch("/api/logout")
                            .then((res) => res.json())
                            .then((data) => {
                                if (data.success) props.login(false);
                            });
                    }}
                >
                    Logout
                </button>
                <div class="grid grid-cols-2">
                    <button
                        class={`text-white font-medium py-2 px-4 rounded-t ${
                            tab() === "fobs" ? "bg-slate-400" : "bg-slate-500"
                        }`}
                        onClick={() => setTab("fobs")}
                    >
                        Fobs
                    </button>
                    <button
                        class={`text-white font-medium py-2 px-4 rounded-t ${
                            tab() === "logs" ? "bg-slate-400" : "bg-slate-500"
                        }`}
                        onClick={() => setTab("logs")}
                    >
                        Logs
                    </button>
                    {tab() === "fobs" ? (
                        <div class="col-span-2 bg-slate-400 rounded-b">
                            <Show when={!keyFobs.isLoading && keyFobs.isSuccess} fallback={<p>Loading...</p>}>
                                <Show when={keyFobs.data?.length} fallback={<p>No fobs to be listed!</p>}>
                                    <For each={keyFobs.data?.sort((a, b) => (a.id > b.id ? 1 : -1))}>
                                        {(keyFob) => (
                                            <div class="bg-slate-400 m-1 grid grid-cols-9 rounded items-center">
                                                {keyFob.enabled ? (
                                                    <span class="bg-green-400 rounded-full w-4 h-4 m-2 col-span-1" />
                                                ) : (
                                                    <span class="bg-red-400 rounded-full w-4 h-4 m-2 col-span-1" />
                                                )}
                                                <span class="m-1 text-white text-xl mx-0 col-span-4 overflow-hidden text-left">
                                                    {keyFob.name}
                                                </span>
                                                <button
                                                    class="bg-blue-500 font-medium text-white m-1 rounded p-1 col-span-2"
                                                    onClick={async () => {
                                                        setBeingEdited(structuredClone(keyFob));
                                                    }}
                                                >
                                                    Modify
                                                </button>
                                                <button
                                                    class="bg-red-500 m-1 font-medium text-white rounded p-1 col-span-2"
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
                        <div class="col-span-2 bg-slate-400 text-white  rounded-b p-2 overflow-x-hide overflow-y-scroll max-h-[60vh] text-xs md:text-base">
                            <Show when={logs.data} fallback={<p>Loading...</p>}>
                                <div class="font-bold grid grid-cols-4">
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
                                                                known ? "text-green-400" : "text-red-600 cursor-pointer"
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
                                    <p class="font-semibold text-xs md:text-base">Loading...</p>
                                </Show>
                                <Show when={!logs.hasNextPage}>
                                    <p class="font-semibold text-xs md:text-base">Reached end of logs</p>
                                </Show>
                            </Show>
                        </div>
                    )}
                </div>
                <Show when={beingEdited()}>
                    <div class="fixed inset-0 overflow-y-auto">
                        <div
                            class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 bg-opacity-50 bg-black"
                            onClick={(e) => {
                                if (e.target.isEqualNode(e.currentTarget)) {
                                    setBeingEdited(null);
                                    setShowPin(false);
                                }
                            }}
                        >
                            <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                            <div class="relative inline-block align-bottom bg-white rounded-lg px-2 pt-3 pb-2 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
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
                                        class="shadow border rounded w-auto py-2 m-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                                            class="shadow border rounded w-auto py-2 m-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                                            class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-700"
                                            onClick={() => setShowPin((prev) => !prev)}
                                        >
                                            {showPin() ? (
                                                <Icon path={eye} class="w-6 mx-1" />
                                            ) : (
                                                <Icon path={eyeSlash} class="w-6 mx-1" />
                                            )}
                                        </div>
                                    </div>
                                    <label>Enabled</label>
                                    <div class="w-full text-left col-span-1">
                                        <input
                                            class="shadow border rounded p-2 m-3 focus:ring-0"
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
                                        <div class="col-span-full w-full flex justify-center">
                                            {errorMessage ? <p class="text-red-500">{errorMessage()}</p> : null}
                                        </div>
                                    </Show>
                                    <div class="col-span-full w-full flex justify-center">
                                        <button type="submit" class="rounded p-2 bg-blue-500 text-white">
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
