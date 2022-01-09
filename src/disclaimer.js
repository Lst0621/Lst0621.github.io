function add_disclaimer(para_id) {
    var paragraphElement = document.createElement("p");
    paragraphElement.appendChild(document.createTextNode("Disclaimer"));
    paragraphElement.appendChild(document.createElement('br'));
    var disclaimer_text = "This article is for entertainment purpose only and does NOT serve as financial advice.         Please be responsible for your own financial situation.";
    paragraphElement.appendChild(document.createTextNode(disclaimer_text));
    document.getElementById(para_id).appendChild(paragraphElement);
}
