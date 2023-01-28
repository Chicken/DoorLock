/* @refresh reload */
import { Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { client, queryClient, trpcQuery } from "./api.js";
import { App } from "./components/App.jsx";
import "./index.css";

render(
    () => (
        <trpcQuery.Provider client={client} queryClient={queryClient}>
            <Router>
                <App />
            </Router>
        </trpcQuery.Provider>
    ),
    document.getElementById("root")!
);
