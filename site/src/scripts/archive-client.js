/**
 * Client-side category + keyword filters for monthly archive pages.
 * Bundled to a shared hashed asset (see home-client.js).
 */
export function initArchiveSearch() {
  const categoryBtns = document.querySelectorAll("[data-category]");
  const input = document.getElementById("archive-search");
  const cards = [...document.querySelectorAll(".card")];
  const separators = [...document.querySelectorAll(".day-separator")];
  const emptyEl = document.getElementById("empty");

  if (!cards.length) return;

  const cardTexts = new Map(
    cards.map((card) => [card, card.textContent.toLowerCase()]),
  );

  let activeCategory = "all";
  let activeQuery = "";

  function applyFilters() {
    const visibleDates = new Set();
    let visibleCount = 0;

    cards.forEach((card) => {
      const matchCategory =
        activeCategory === "all" || card.dataset.category === activeCategory;
      const matchQuery =
        !activeQuery || cardTexts.get(card).includes(activeQuery);
      const visible = matchCategory && matchQuery;

      card.style.display = visible ? "" : "none";
      if (visible) {
        visibleCount++;
        visibleDates.add(card.dataset.displayDate);
      }
    });

    separators.forEach((sep) => {
      sep.style.display = visibleDates.has(sep.dataset.date) ? "" : "none";
    });

    if (emptyEl) emptyEl.style.display = visibleCount === 0 ? "" : "none";
  }

  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      activeCategory = btn.dataset.category || "all";
      applyFilters();
    });
  });

  if (input) {
    input.addEventListener("input", () => {
      activeQuery = input.value.trim().toLowerCase();
      applyFilters();
    });
  }
}
