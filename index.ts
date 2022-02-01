const $view = document.getElementById("carousel");

console.log("$view", $view);

const $container = $view?.querySelector(".container");

console.log("$container", $container);

const PANEL_COUNT = $container?.querySelectorAll(".panel").length;

console.log("PANEL_COUNT", PANEL_COUNT);