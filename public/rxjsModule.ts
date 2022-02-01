import {fromEvent} from "rxjs";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const $view = document.getElementById("carousel")!; // null이 아님을 보장할 수 있음
console.log("$view", $view);

const $container = $view?.querySelector(".container");
console.log("$container", $container);

const PANEL_COUNT = $container?.querySelectorAll(".panel").length;
console.log("PANEL_COUNT", PANEL_COUNT);


const SUPPORT_TOUCH = "ontouchstart" in window;
const EVENTS = {
    start: SUPPORT_TOUCH ? "touchstart" : "mousedown",
    move: SUPPORT_TOUCH ? "touchmove" : "mousemove",
    end: SUPPORT_TOUCH ? "touchend" : "mouseup"
}

export const makeObservable = () => {
    const start$ = fromEvent($view, EVENTS.start);
    const move$ = fromEvent($view, EVENTS.move);
    const end$ = fromEvent($view, EVENTS.end);
    
    console.log("start$, move$, end$", start$, move$, end$);
}
