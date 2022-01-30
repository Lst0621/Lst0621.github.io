function update_theme_color_as_bg_color() {
    let head_element: HTMLHeadElement = document.getElementsByTagName('head')[0]
    let backgroundColor: string = window.getComputedStyle(head_element).backgroundColor
    console.log(backgroundColor)

    let color_meta: HTMLMetaElement = document.createElement('meta');
    color_meta.name = "theme-color"
    color_meta.content = backgroundColor
    head_element.appendChild(color_meta);
}
