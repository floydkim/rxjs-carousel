"use strict";
const $view = document.getElementById("carousel");
console.log("$view", $view);
const $container = $view === null || $view === void 0 ? void 0 : $view.querySelector(".container");
console.log("$container", $container);
const PANEL_COUNT = $container === null || $container === void 0 ? void 0 : $container.querySelectorAll(".panel").length;
console.log("PANEL_COUNT", PANEL_COUNT);
