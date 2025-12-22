function get_filename_ts_from_text(text) {
    var lines = text.split('\n');
    console.log(lines.length);
    var filename_ts = {};
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        if (line.length == 0) {
            continue;
        }
        var parts = line.split(',');
        var fn = parts[0];
        var day = parts[1];
        filename_ts[fn] = day;
    }
    return filename_ts;
}
function fetch_last_modify_and_update_text(text, filenames, para_id) {
    var filename_ts = get_filename_ts_from_text(text);
    console.log(filename_ts);
    var last_modify_time = "";
    for (var _i = 0, filenames_1 = filenames; _i < filenames_1.length; _i++) {
        var fn = filenames_1[_i];
        if (fn in filename_ts) {
            var day = filename_ts[fn];
            console.log(fn, day);
            if (day > last_modify_time) {
                last_modify_time = day;
            }
        }
    }
    if (last_modify_time == "") {
        console.log("No data found!");
        return;
    }
    var last_modify_info = "This page was last modified on  ".concat(last_modify_time, ".");
    console.log(last_modify_info);
    var paragraphElement = document.createElement("p");
    paragraphElement.appendChild(document.createTextNode(last_modify_info));
    document.getElementById(para_id).appendChild(paragraphElement);
}
function get_last_modify(filenames, para_id) {
    var req = new XMLHttpRequest();
    req.addEventListener("load", function () {
        fetch_last_modify_and_update_text(this.responseText, filenames, para_id);
    });
    var HISTORY_FILE_URL = "https://raw.githubusercontent.com/Lst0621/website_history/main/history.csv";
    req.open("GET", HISTORY_FILE_URL);
    req.send();
}
