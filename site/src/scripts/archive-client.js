/**
 * Client-side keyword filter for monthly archive pages.
 * Bundled to a shared hashed asset (see home-client.js).
 */
export function initArchiveSearch() {
  const input = document.getElementById("archive-search");
  if (!input) return;

  const cards = [...document.querySelectorAll(".card")];
  const separators = [...document.querySelectorAll(".day-separator")];
  const emptyEl = document.getElementById("empty");
  const cardTexts = new Map(
    cards.map((card) => [card, card.textContent.toLowerCase()]),
  );

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    const visibleDates = new Set();
    let visibleCount = 0;

    cards.forEach((card) => {
      const visible = !query || cardTexts.get(card).includes(query);
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
  });
}
