var canvas = document.getElementById('canvas_power_mod');
var head_span = document.getElementById("head_span");
var context = canvas.getContext("2d");
function draw() {
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.width);
    var degree = Number(document.getElementById("power_input").value);
    var range = Number(document.getElementById("range_input").value);
    head_span.innerText = "Power(n, " + degree.toString() + ") % " + range.toString();
    var numbers = [];
    var powers = [];
    var len = range * 2;
    for (var i = 0; i < len; i++) {
        numbers.push(i);
        var r = 1;
        for (var j = 0; j < degree; j++) {
            r = r * i % range;
        }
        powers.push(r);
    }
    var x_scale = Math.floor(canvas.width / len);
    var y_scale = Math.floor(canvas.height / (range + 1));
    var table = document.getElementById("powers");
    table.style.alignSelf = "center";
    table.style.borderStyle = "solid";
    while (true) {
        if (table.rows.length == 0) {
            break;
        }
        table.deleteRow(0);
    }
    for (var i = 0; i < len; i++) {
        var x0 = x_scale * numbers[i];
        var x1 = x_scale * numbers[i + 1];
        var y0 = powers[i];
        var y1 = powers[i + 1];
        var row = table.insertRow();
        row.style.background = i % 2 == 0 ? "yellow" : "lightgreen";
        var cell = row.insertCell();
        cell.innerText = numbers[i].toString();
        cell = row.insertCell();
        cell.innerText = Math.pow(numbers[i], degree).toString();
        cell = row.insertCell();
        cell.innerText = powers[i].toString();
        console.log(x0.toString() + " " + y0.toString());
        if (i + 1 < len) {
            context.strokeStyle = "black";
            context.beginPath();
            context.moveTo(x0, canvas.height - y_scale * y0);
            context.lineTo(x1, canvas.height - y_scale * y1);
            context.stroke();
        }
    }
}
draw();
