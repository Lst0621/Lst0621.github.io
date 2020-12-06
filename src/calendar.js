var dateTime = new Date();
var today = dateTime.getDate();
var lastDayOfMonth = new Date(dateTime.getFullYear(), dateTime.getMonth() + 1, 0).getDate();
dateTime.setDate(1);
var table_id = "demo";
var table = (document.getElementById(table_id));
//table.setAttribute("border","1")
var thead = table.createTHead();
var tbody = table.createTBody();
var options = { month: 'long' };
var month_cell = thead.insertRow(0).insertCell(0);
month_cell.textContent = dateTime.toLocaleString("en-US", options);
month_cell.setAttribute("align", "center");
month_cell.setAttribute("colspan", "5");
for (var i = 1; i <= 7; i++) {
    dateTime.setDate(i);
    var weekday_cell = tbody.insertRow(-1).insertCell(0);
    var options_1 = { weekday: 'long' };
    weekday_cell.textContent = dateTime.toLocaleString("en-US", options_1);
    weekday_cell.setAttribute("align", "center");
    weekday_cell.setAttribute("colspan", "5");
    var date_row = tbody.insertRow(-1);
    for (var j = i; j <= lastDayOfMonth; j += 7) {
        var cell = date_row.insertCell(-1);
        cell.setAttribute("width", "40");
        cell.innerText = j.toString();
        if (j == today) {
            cell.setAttribute("bgColor", "red");
        }
        cell.setAttribute("align", "center");
    }
}
