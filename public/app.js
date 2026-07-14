// If this runs, the server delivered a .js file with a MIME type the
// browser accepted — flip the checklist entry from fail to ok.
const dot = document.querySelector("#check-js .dot");
dot.classList.replace("fail", "ok");
document.getElementById("js-status").textContent = "app.js executed";

document.getElementById("loaded-at").textContent =
  `served ${new Date().toLocaleTimeString()}`;
