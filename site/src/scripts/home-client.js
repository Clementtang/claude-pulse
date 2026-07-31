/**
 * Client behavior for locale home pages: language redirect, status light,
 * relative timestamps, and category/range/search filters.
 *
 * Bundled by Astro into a hashed /_astro/*.js asset so all five locales
 * share one cacheable payload instead of inlining ~10 KB per HTML page.
 *
 * @param {object} config
 * @param {string} config.currentLocale
 * @param {string[]} config.supportedLocales
 * @param {Record<string, string>} config.relativeStrings
 * @param {string} config.statusOkDefault
 * @param {string} config.weekdayFormat
 * @param {string} config.basePath
 */
export function initHomePage(config) {
  const {
    currentLocale,
    supportedLocales,
    relativeStrings,
    statusOkDefault,
    weekdayFormat,
    basePath,
  } = config;

  autoDetectLocale(currentLocale, supportedLocales, basePath);
  loadStatus(statusOkDefault);
  formatTimes(currentLocale, weekdayFormat, relativeStrings);
  initFilters();
}

function autoDetectLocale(currentLocale, supportedLocales, basePath) {
  try {
    // Never redirect crawlers. A JS locale redirect makes Googlebot (which
    // presents as en) treat /ja/, /ko/, etc. as "Page with redirect" and drop
    // them from the index — bots must render each locale page as-is.
    if (/bot|crawl|spider|slurp/i.test(navigator.userAgent || "")) return;

    if (localStorage.getItem("claude-pulse-lang-redirected")) return;

    const browserLang = navigator.language || "en";

    let matched = supportedLocales.find((l) => l === browserLang);

    if (!matched) {
      matched = supportedLocales.find((l) => browserLang.startsWith(l));
    }

    if (!matched) {
      const primary = browserLang.split("-")[0].toLowerCase();
      if (primary === "zh") {
        if (/-(CN|SG)/i.test(browserLang)) matched = "zh-CN";
        else matched = "zh-TW";
      } else if (primary === "ja") matched = "ja";
      else if (primary === "ko") matched = "ko";
      else matched = "en";
    }

    localStorage.setItem("claude-pulse-lang-redirected", "1");

    if (matched && matched !== currentLocale) {
      const target =
        matched === "en" ? basePath : basePath + matched + "/";
      window.location.replace(target);
    }
  } catch {
    // localStorage/navigator unavailable — skip
  }
}

async function loadStatus(statusOkDefault) {
  const link = document.getElementById("status-link");
  if (!link) return;

  const dot = link.querySelector(".status-dot");
  const text = link.querySelector(".status-text");
  if (!dot || !text) return;

  try {
    const [statusRes, incidentsRes] = await Promise.all([
      fetch("https://status.claude.com/api/v2/status.json"),
      fetch("https://status.claude.com/api/v2/incidents/unresolved.json"),
    ]);

    if (!statusRes.ok || !incidentsRes.ok) {
      throw new Error("Status API unavailable");
    }

    const statusData = await statusRes.json();
    const incidentsData = await incidentsRes.json();

    const indicator =
      (statusData.status && statusData.status.indicator) || "none";
    const apiDescription =
      statusData.status && statusData.status.description;
    const firstIncident =
      incidentsData.incidents && incidentsData.incidents[0];

    dot.setAttribute("data-indicator", indicator);
    text.textContent =
      (firstIncident && firstIncident.name) ||
      (indicator === "none" ? statusOkDefault : apiDescription) ||
      statusOkDefault;

    link.classList.add("ready");
  } catch {
    link.style.display = "none";
  }
}

function formatTimes(currentLocale, weekdayFormat, relativeStrings) {
  const TZ =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Taipei";

  const ymdhmFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  function formatYmdHm(d) {
    const parts = ymdhmFormatter.formatToParts(d);
    const get = (type) => {
      const p = parts.find((x) => x.type === type);
      return p ? p.value : "";
    };
    return (
      get("year") +
      "-" +
      get("month") +
      "-" +
      get("day") +
      " " +
      get("hour") +
      ":" +
      get("minute")
    );
  }

  // Pin to Hanoi to match server-side displayDate grouping.
  const weekdayFormatter = new Intl.DateTimeFormat(currentLocale, {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: weekdayFormat || "long",
  });

  function interp(tmpl, n) {
    return tmpl.replace("{n}", String(n));
  }

  function formatRelative(iso) {
    const d = new Date(iso);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return relativeStrings.justNow;
    if (diffSec < 3600)
      return interp(relativeStrings.minutesAgo, Math.floor(diffSec / 60));
    if (diffSec < 86400)
      return interp(relativeStrings.hoursAgo, Math.floor(diffSec / 3600));
    const days = Math.floor(diffSec / 86400);
    if (days < 30) return interp(relativeStrings.daysAgo, days);
    const months = Math.floor(days / 30);
    if (months < 12) return interp(relativeStrings.monthsAgo, months);
    return interp(relativeStrings.yearsAgo, Math.floor(days / 365));
  }

  document.querySelectorAll(".card-time[data-datetime]").forEach((el) => {
    const iso = el.dataset.datetime;
    const d = new Date(iso);
    const abs = formatYmdHm(d);
    const rel = formatRelative(iso);
    el.textContent = abs + " · " + rel;
  });

  document.querySelectorAll(".day-separator-chip").forEach((el) => {
    const dateStr = el.getAttribute("datetime");
    if (!dateStr) return;
    const d = new Date(dateStr + "T12:00:00Z");
    const weekday = weekdayFormatter.format(d);
    el.textContent = dateStr + " " + weekday;
  });
}

function initFilters() {
  const categoryBtns = document.querySelectorAll("[data-category]");
  const rangeBtns = document.querySelectorAll("[data-range]");
  const cards = document.querySelectorAll(".card");
  const separators = document.querySelectorAll(".day-separator");
  const emptyEl = document.getElementById("empty");

  let activeCategory = "all";
  let activeRange = "7";
  let activeQuery = "";

  const cardTexts = new Map(
    [...cards].map((card) => [card, card.textContent.toLowerCase()]),
  );

  function daysSince(iso) {
    const d = new Date(iso);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  function applyFilters() {
    let visibleCount = 0;
    const visibleDates = new Set();

    cards.forEach((card) => {
      const cat = card.dataset.category;
      const iso = card.dataset.datetime;
      const days = daysSince(iso);

      const matchCategory =
        activeCategory === "all" || cat === activeCategory;
      const matchRange =
        activeRange === "all" || days <= parseInt(activeRange, 10);
      const matchQuery =
        !activeQuery || cardTexts.get(card).includes(activeQuery);
      const visible = matchCategory && matchRange && matchQuery;

      card.style.display = visible ? "" : "none";
      if (visible) {
        visibleCount++;
        visibleDates.add(card.dataset.displayDate);
      }
    });

    separators.forEach((sep) => {
      const date = sep.dataset.date;
      sep.style.display = visibleDates.has(date) ? "" : "none";
    });

    if (emptyEl) {
      emptyEl.style.display = visibleCount === 0 ? "" : "none";
    }
  }

  categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      activeCategory = btn.dataset.category;
      applyFilters();
    });
  });

  rangeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      rangeBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      activeRange = btn.dataset.range;
      applyFilters();
    });
  });

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      activeQuery = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  applyFilters();
}
