"use strict";
let urlSearchParams = new URLSearchParams(window.location.search.substring(1));
console.log(window.location.hostname);
console.log(window.location);
let iter = 1;
if (urlSearchParams.has('iter')) {
    iter = parseInt(urlSearchParams.get('iter'));
}
let limit = 7;
let frame = document.getElementById("recur_frame");
if (iter < limit && iter >= 1) {
    frame.src = window.location.origin + window.location.pathname + "?iter=" + (iter + 1);
    frame.height = ((limit - iter) * 150).toString();
}
else {
    frame.height = "0";
}
let p1 = document.getElementById("p1");
p1.innerText = window.location.href;
let head_span = document.getElementById("head_span");
head_span.innerText = "ERP is Recursive Page (" + iter + " / " + limit + ")";
