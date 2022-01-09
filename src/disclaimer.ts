function add_disclaimer(para_id: string) {
    let paragraphElement: HTMLParagraphElement = document.createElement("p");
    paragraphElement.appendChild(document.createTextNode("Disclaimer"))
    paragraphElement.appendChild(document.createElement('br'))
    const disclaimer_text: string =
        `This article is for entertainment purpose only and does NOT serve as financial advice.\
         Please be responsible for your own financial situation.`
    paragraphElement.appendChild(document.createTextNode(disclaimer_text));
    document.getElementById(para_id).appendChild(paragraphElement);
}
