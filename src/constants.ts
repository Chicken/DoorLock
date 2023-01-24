import { Gpio } from "onoff";

export const DOOR_OPEN = Gpio.HIGH;
export const DOOR_CLOSED = Gpio.LOW;

export const EXIT_NORMAL = 0;
export const EXIT_ERROR = 1;
export const EXIT_CONFIG = 2;

export const SEC_TO_MS = 1000;
