const STORAGE_KEY = "viz-theme";
const THEME_COLOR = { dark: "#090d12", light: "#f4f1ea" };

export class ThemeControl {
  start() {
    const saved = this.read();
    this.apply(saved);
    document.addEventListener("click", (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("[data-theme-choice]")
        : null;
      if (!(button instanceof HTMLButtonElement)) return;
      const theme = button.dataset.themeChoice === "light" ? "light" : "dark";
      this.apply(theme);
      this.write(theme);
    });
  }

  read() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  }

  write(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The page still switches themes when storage is unavailable.
    }
  }

  apply(theme) {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
    for (const button of document.querySelectorAll("[data-theme-choice]")) {
      if (!(button instanceof HTMLButtonElement)) continue;
      const selected = button.dataset.themeChoice === theme;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.classList.toggle("is-selected", selected);
    }
  }
}

new ThemeControl().start();
