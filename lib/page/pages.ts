export interface PageEntry {
  name: string;
  url: string;
}

export interface Section {
  title: string;
  pages: PageEntry[];
  /** If false, this section is not rendered on index.html. Default true. */
  showOnIndex?: boolean;
}

export const sections: Section[] = [
  {
    title: "Website",
    pages: [
      { name: "Set up a website with your own domain name", url: "article/set_up_website.html" },
      { name: "GitHub IO Deploy", url: "article/github_io_deploy.html" },
      { name: "Site Source Code", url: "https://github.com/Lst0621/Lst0621.github.io" },
      { name: "Test Cases for JS files", url: "article/test_cases.html" },
    ],
  },
  {
    title: "Widgets",
    pages: [
      { name: "Fractal tree", url: "article/tree.html" },
      { name: "Number of Scoring Sequences", url: "article/number_of_sequences.html" },
      { name: "Partition Conjugate (C++/WASM)", url: "article/partition_conjugate.html" },
      { name: "Linear Recurrence", url: "article/linear_recur.html" },
      { name: "Linear Recurrence Convolution", url: "article/linear_recur_convolution.html" },
      { name: "Game of Life", url: "article/gol.html" },
      { name: "Game of Life (C++/WASM)", url: "article/gol_cpp.html" },
      { name: "Bars game (C++/WASM)", url: "article/bars_game.html" },
      { name: "Calendar", url: "article/calendar.html" },
      { name: "Labyrinth", url: "article/labyrinth.html" },
      { name: "Recursive Page", url: "article/recursive_page.html" },
      { name: "Trochoid", url: "article/draw_trochoid.html" },
      { name: "Random Maze 1", url: "article/random_maze_1.html" },
      { name: "Encoding", url: "article/encode_string.html" },
      { name: "UZ", url: "article/uz.html" },
      { name: "Space Filling Curve", url: "article/space_filling.html" },
      { name: "Remainder of Powers", url: "article/power_mod.html" },
      { name: "Cartesian Product", url: "article/cartesian_product.html" },
      { name: "Hex Distance", url: "article/hex_dist.html" },
      { name: "Hex Game of Life", url: "article/hex_gol.html" },
      { name: "Multiplication Tables", url: "article/multiplication_tables.html" },
      { name: "Square Patterns", url: "article/square_patterns.html" },
      { name: "Permutation Product Calculator", url: "article/permutation_product_calculator.html" },
      { name: "Set Relations", url: "article/set_relation.html" },
      { name: "Tip Calculator", url: "article/tip.html" },
      { name: "Polynomial Properties", url: "article/polynomial_properties.html" },
      { name: "Strictly Piecewise Languages", url: "article/sp_lang.html" },
      { name: "Continued Fractions", url: "article/continued_fractions.html" },
      { name: "Lamp Lighter", url: "article/lamp_lighter.html" },
      { name: "Graph Demo", url: "article/graph_demo.html" },
    ],
  },
  {
    title: "Finance",
    pages: [
      { name: "Credit Card Refer", url: "article/credit_card_refer.html" },
      { name: "Virtual Credit Card Number", url: "article/virtual_card.html" },
    ],
  },
  {
    title: "Games",
    pages: [
      { name: "Auto mouse click script", url: "article/click.html" },
      { name: "How to request Xbox Controller repair", url: "article/controller.html" },
    ],
  },
  {
    title: "Miscellaneous",
    pages: [
      { name: "Reading List", url: "article/reading_list.html" },
      { name: "My Book Collections", url: "article/library_of_haojun.html" },
      { name: "Frog & Toad", url: "article/frog_toad.html" },
      { name: "走不完的路/Routes", url: "article/routes.html" },
      { name: "My Wishlists", url: "article/wish.html" },
    ],
  },
  {
    title: "Coding",
    pages: [
      { name: "LeetCode 2183 Count Array Pairs Divisible by K", url: "article/leet/leet_2183.html" },
    ],
  },
  {
    title: "Unlisted",
    showOnIndex: false,
    pages: [
      { name: "Garage of Joey", url: "article/garage_of_joey.html" },
      { name: "Edthan Lab", url: "article/edthan_lab.html" },
      { name: "Grid", url: "article/grid.html" },
      { name: "Template", url: "article/template.html" },
    ],
  },
];

function renderSitePages(): void {
  if (typeof document === "undefined") {
    return;
  }
  const container = document.getElementById("site-pages");
  if (!container) {
    return;
  }
  for (const section of sections) {
    if (section.showOnIndex === false) {
      continue;
    }
    const h1 = document.createElement("h1");
    h1.textContent = section.title;
    container.appendChild(h1);
    for (const page of section.pages) {
      const a = document.createElement("a");
      a.href = page.url;
      a.textContent = page.name;
      container.appendChild(a);
      container.appendChild(document.createElement("br"));
    }
  }
}

renderSitePages();
