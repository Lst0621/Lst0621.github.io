function reverseString(str: string) {
    return str.split("").reverse().join("");
}

function encode() {
    let input_text: string = (<HTMLInputElement>document.getElementById("input_text")).value;
    console.log(input_text)

    let paragraphElement: HTMLParagraphElement = document.createElement("p");
    const foo: string = reverseString(input_text)
    paragraphElement.appendChild(document.createTextNode(foo))
    let element_id: string = "encoded_id"
    let bar: HTMLElement = document.getElementById(element_id)
    if (bar) {
        document.getElementById("encoded").removeChild(bar)
    }
    paragraphElement.id = element_id
    document.getElementById("encoded").appendChild(paragraphElement)
}