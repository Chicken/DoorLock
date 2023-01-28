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
        <div class="p-4 bg-slate-300 rounded-md text-center">
            <h1 class="text-3xl font-medium">Login</h1>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    login();
                }}
            >
                <input
                    class="shadow border rounded w-auto py-2 m-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    type="password"
                    placeholder="Password"
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                />
                <button
                    class="shadow rounded font-bold py-2 px-4 m-3 bg-blue-500 hover:bg-blue-600 text-white"
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
