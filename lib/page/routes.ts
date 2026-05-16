/** One Strava route group; add `{ title, ids }` or append to `ids` to extend the page. */
interface RouteSection {
  title: string;
  /** Strava route numeric id from the share/embed URL */
  ids: string[];
}

const routeSections: RouteSection[] = [
  {
    title: "Bay Area",
    ids: [
      "3490570694370277428",
      "3472088871984581718",
      "3488334005468525352",
      "3353583808164376562",
      "3346330263085465984",
      "3429207280393573228",
      "3429763576313782614",
      "3351832393837065248",
      "3083615155816235334",
      "24196013"
    ],
  },
  {
    title: "San Diego",
    ids: ["3231398186456999744"],
  },
];

function renderStravaSections(container: HTMLElement): void {
  for (const section of routeSections) {
    const heading = document.createElement("p");
    heading.textContent = section.title;
    container.appendChild(heading);
    for (const id of section.ids) {
      const placeholder = document.createElement("div");
      placeholder.className = "strava-embed-placeholder";
      placeholder.dataset.embedType = "route";
      placeholder.dataset.embedId = id;
      placeholder.dataset.style = "standard";
      placeholder.dataset.fromEmbed = "false";
      container.appendChild(placeholder);
    }
  }
}

const mount = document.getElementById("strava-route-sections");
if (mount) {
  renderStravaSections(mount);
}
