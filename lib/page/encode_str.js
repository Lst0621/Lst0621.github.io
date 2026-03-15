"use strict";
function reverseString(str) {
    let rev = str.split("").reverse().join("");
    let ret = "";
    for (let c of rev) {
        if (c >= 'a' && c <= 'z') {
            ret += String.fromCharCode('a'.charCodeAt(0) + 'z'.charCodeAt(0) - c.charCodeAt(0));
            continue;
        }
        if (c >= 'A' && c <= 'Z') {
            ret += String.fromCharCode('A'.charCodeAt(0) + 'Z'.charCodeAt(0) - c.charCodeAt(0));
            continue;
        }
        ret += c;
    }
    return ret;
}
function encode() {
    let input_text = document.getElementById("input_text").value;
    console.log(input_text);
    let paragraphElement = document.createElement("p");
    const foo = reverseString(input_text);
    paragraphElement.appendChild(document.createTextNode(foo));
    let element_id = "encoded_id";
    let bar = document.getElementById(element_id);
    if (bar) {
        document.getElementById("encoded").removeChild(bar);
    }
    paragraphElement.id = element_id;
    document.getElementById("encoded").appendChild(paragraphElement);
}
