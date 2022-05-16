function reverseString(str) {
    return str.split("").reverse().join("");
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
