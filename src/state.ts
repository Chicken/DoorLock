import type { User } from "./config.js";

export const LoginStage = {
    WaitingForFob: "WaitingForFob",
    WaitingForPin: "WaitingForPin",
} as const;
type ObjectValues<T> = T[keyof T];
export type LoginStage = ObjectValues<typeof LoginStage>;

class State {
    public loginStage: LoginStage = LoginStage.WaitingForFob;
    public loggedInUser: User | null = null;
    public pinTimeout: NodeJS.Timeout | null = null;
}

export const state = new State();

export function resetState(): void {
    state.loggedInUser = null;
    state.loginStage = LoginStage.WaitingForFob;
}

export function clearPinTimeout(): void {
    if (state.pinTimeout) {
        clearTimeout(state.pinTimeout);
        state.pinTimeout = null;
    }
}
