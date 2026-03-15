"use strict";
function add_disclaimer(para_id) {
    let paragraphElement = document.createElement("p");
    paragraphElement.appendChild(document.createTextNode("Disclaimer"));
    paragraphElement.appendChild(document.createElement('br'));
    const disclaimer_text = `This article is for entertainment purpose only and does NOT serve as financial advice.\
         Please be responsible for your own financial situation.`;
    paragraphElement.appendChild(document.createTextNode(disclaimer_text));
    const el = document.getElementById(para_id);
    if (el) {
        el.appendChild(paragraphElement);
    }
}
