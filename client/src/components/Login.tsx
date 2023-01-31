import { Component, createSignal, Setter, Show } from "solid-js";

export const Login: Component<{ login: Setter<boolean> }> = (props) => {
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
    const [password, setPassword] = createSignal<string>("");

    function login() {
        fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                password: password(),
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) props.login(true);
                else setErrorMessage(data.error);
            });
    }

    return (
        <div class="rounded-md bg-slate-300 p-4 text-center">
            <h1 class="text-3xl font-medium">Login</h1>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    login();
                }}
            >
                <input
                    class="focus:shadow-outline m-3 w-auto rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
                    type="password"
                    placeholder="Password"
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                />
                <button
                    class="m-3 rounded bg-blue-500 py-2 px-4 font-bold text-white shadow hover:bg-blue-600"
                    onClick={login}
                >
                    Login
                </button>
            </form>
            <Show when={errorMessage}>
                <p class="text-red-500">{errorMessage()}</p>
            </Show>
        </div>
    );
};
