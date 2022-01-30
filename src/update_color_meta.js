function update_theme_color_as_bg_color() {
    var head_element = document.getElementsByTagName('head')[0];
    var backgroundColor = window.getComputedStyle(head_element).backgroundColor;
    console.log(backgroundColor);
    var color_meta = document.createElement('meta');
    color_meta.name = "theme-color";
    color_meta.content = backgroundColor;
    head_element.appendChild(color_meta);
}
