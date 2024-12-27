function reverseString(str) {
    var rev = str.split("").reverse().join("");
    var ret = "";
    for (var _i = 0, rev_1 = rev; _i < rev_1.length; _i++) {
        var c = rev_1[_i];
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
    var input_text = document.getElementById("input_text").value;
    console.log(input_text);
    var paragraphElement = document.createElement("p");
    var foo = reverseString(input_text);
    paragraphElement.appendChild(document.createTextNode(foo));
    var element_id = "encoded_id";
    var bar = document.getElementById(element_id);
    if (bar) {
        document.getElementById("encoded").removeChild(bar);
    }
    paragraphElement.id = element_id;
    document.getElementById("encoded").appendChild(paragraphElement);
}
