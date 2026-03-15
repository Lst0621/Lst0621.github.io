"use strict";
function get_filename_ts_from_text(text) {
    let lines = text.split('\n');
    console.log(lines.length);
    let filename_ts = {};
    for (let line of lines) {
        if (line.length == 0) {
            continue;
        }
        let parts = line.split(',');
        let fn = parts[0];
        let day = parts[1];
        filename_ts[fn] = day;
    }
    return filename_ts;
}
function fetch_last_modify_and_update_text(text, filenames, para_id) {
    let filename_ts = get_filename_ts_from_text(text);
    console.log(filename_ts);
    let last_modify_time = "";
    for (let fn of filenames) {
        if (fn in filename_ts) {
            let day = filename_ts[fn];
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
    let last_modify_info = `This page was last modified on  ${last_modify_time}.`;
    console.log(last_modify_info);
    let paragraphElement = document.createElement("p");
    paragraphElement.appendChild(document.createTextNode(last_modify_info));
    const el = document.getElementById(para_id);
    if (el) {
        el.appendChild(paragraphElement);
    }
}
function get_last_modify(filenames, para_id) {
    let req = new XMLHttpRequest();
    req.addEventListener("load", function () {
        fetch_last_modify_and_update_text(this.responseText, filenames, para_id);
    });
    let HISTORY_FILE_URL = "https://raw.githubusercontent.com/Lst0621/website_history/main/history.csv";
    req.open("GET", HISTORY_FILE_URL);
    req.send();
}
