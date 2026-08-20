/**
 * Share-as-image for timeline cards (Futu-style share card).
 *
 * Draws the card on an offscreen canvas instead of screenshotting the DOM:
 * deterministic layout, fixed light palette regardless of viewer theme, and
 * no html-to-image dependency. Localized strings arrive via data attributes
 * on #timeline so this bundle stays identical (and cacheable) across locales.
 */
import QRCode from "qrcode";

const SITE_DOMAIN = "claude-pulse.chatbot.tw";
const BODY_MAX_CHARS = 200;
const CARD_WIDTH = 640;
const SCALE = 2;
const PAD = 44;

// Fixed light palette (matches the site's light theme tokens in Base.astro).
const C = {
  bg: "#faf9f0",
  text: "#1a1a1b",
  secondary: "#5c5a52",
  tertiary: "#9c9889",
  accent: "#d97757",
  border: "#e5e2d5",
};

export function initShareCards() {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;

  const strings = {
    copied: timeline.dataset.shareCopied,
    downloaded: timeline.dataset.shareDownloaded,
    failed: timeline.dataset.shareFailed,
    subtitle: timeline.dataset.shareSubtitle,
  };

  timeline.addEventListener("click", (e) => {
    const btn = e.target.closest(".card-share-btn");
    if (!btn) return;
    const card = btn.closest(".card");
    if (!card) return;
    handleShare(card, strings).catch(() => toast(strings.failed));
  });
}

async function handleShare(card, strings) {
  const data = extractCardData(card);
  // Kick off rendering immediately; both share paths below must stay within
  // the click's transient activation window.
  const blobPromise = renderCard(data, strings);

  const file = new File([new Blob()], "probe.png", { type: "image/png" });
  const canShareFiles =
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] });
  const isTouchDevice = /Android|iPhone|iPad/i.test(navigator.userAgent);

  if (canShareFiles && isTouchDevice) {
    const blob = await blobPromise;
    await navigator.share({
      files: [new File([blob], `${data.anchor}.png`, { type: "image/png" })],
      title: data.title || "Claude Pulse",
    });
    return;
  }

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      // Promise-valued ClipboardItem keeps Safari happy: clipboard.write is
      // called synchronously within the gesture, the PNG resolves later.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blobPromise }),
      ]);
      toast(strings.copied);
      return;
    } catch {
      // fall through to download
    }
  }

  const blob = await blobPromise;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `claude-pulse-${data.anchor}.png`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(strings.downloaded);
}

function extractCardData(card) {
  const summary = card.querySelector(".card-summary")?.textContent.trim() || "";
  // Summaries follow "title sentence — body"; the first separator wins.
  const sep = summary.indexOf(" — ");
  const title = sep > 0 ? summary.slice(0, sep) : summary;
  const body = sep > 0 ? summary.slice(sep + 3) : "";
  return {
    anchor: card.id,
    title,
    body:
      body.length > BODY_MAX_CHARS ? body.slice(0, BODY_MAX_CHARS) + "…" : body,
    category: card.querySelector(".card-category")?.textContent.trim() || "",
    categoryColor:
      getComputedStyle(card).getPropertyValue("--cat-color").trim() || C.accent,
    // The visible .card-time is rewritten to a relative label ("6 小時前")
    // which would go stale inside a static image — rebuild from the UTC value.
    timeLabel: formatUtc(card.dataset.datetime),
    source: card.querySelector(".card-source")?.textContent.trim() || "",
    displayDate: card.dataset.displayDate || "",
    url: `${location.origin}${location.pathname}#${card.id}`,
  };
}

async function renderCard(data, strings) {
  await document.fonts.ready;
  const rootStyle = getComputedStyle(document.documentElement);
  const fontBody =
    rootStyle.getPropertyValue("--font-body").trim() || "sans-serif";
  const fontDisplay =
    rootStyle.getPropertyValue("--font-display").trim() || "serif";
  const fontMono =
    rootStyle.getPropertyValue("--font-mono").trim() || "monospace";

  const qrSize = 92;
  const qrDataUrl = await QRCode.toDataURL(data.url, {
    width: qrSize * SCALE,
    margin: 0,
    color: { dark: C.text, light: "#00000000" },
  });
  const qrImg = await loadImage(qrDataUrl);

  const contentWidth = CARD_WIDTH - PAD * 2;
  const measure = document.createElement("canvas").getContext("2d");

  const titleFont = `700 24px ${fontBody}`;
  const bodyFont = `400 15.5px ${fontBody}`;
  const titleLines = wrapText(measure, data.title, titleFont, contentWidth, 6);
  const bodyLines = wrapText(measure, data.body, bodyFont, contentWidth, 7);

  const titleLH = 35;
  const bodyLH = 27;
  const footerH = Math.max(qrSize, 64);

  let y = PAD;
  y += 30; // brand row
  y += 34; // category row
  const titleY = y;
  y += titleLines.length * titleLH;
  if (bodyLines.length) y += 14;
  const bodyY = y;
  y += bodyLines.length * bodyLH;
  y += 28; // gap before divider
  const dividerY = y;
  y += 22;
  const footerY = y;
  y += footerH + PAD;
  const cardHeight = y;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * SCALE;
  canvas.height = cardHeight * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);
  ctx.textBaseline = "alphabetic";

  // Brand row: accent dot + wordmark left, date right
  let by = PAD + 16;
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(PAD + 6, by - 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.font = `600 21px ${fontDisplay}`;
  ctx.fillText("Claude Pulse", PAD + 22, by);
  ctx.font = `400 12px ${fontMono}`;
  ctx.fillStyle = C.tertiary;
  ctx.textAlign = "right";
  ctx.fillText(data.displayDate, CARD_WIDTH - PAD, by);
  ctx.textAlign = "left";

  // Category row
  const cy = PAD + 30 + 20;
  ctx.fillStyle = data.categoryColor;
  ctx.beginPath();
  ctx.arc(PAD + 4, cy - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `600 12px ${fontBody}`;
  ctx.fillText(data.category.toUpperCase(), PAD + 15, cy);

  // Title + body
  ctx.fillStyle = C.text;
  ctx.font = titleFont;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, PAD, titleY + 26 + i * titleLH);
  });
  ctx.fillStyle = C.secondary;
  ctx.font = bodyFont;
  bodyLines.forEach((line, i) => {
    ctx.fillText(line, PAD, bodyY + 18 + i * bodyLH);
  });

  // Divider
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, dividerY);
  ctx.lineTo(CARD_WIDTH - PAD, dividerY);
  ctx.stroke();

  // Footer: site + source left, QR right
  ctx.fillStyle = C.accent;
  ctx.font = `600 14px ${fontBody}`;
  ctx.fillText(SITE_DOMAIN, PAD, footerY + 24);
  ctx.fillStyle = C.tertiary;
  ctx.font = `400 12px ${fontMono}`;
  ctx.fillText(`${data.source} · ${data.timeLabel}`, PAD, footerY + 46);
  ctx.font = `400 12px ${fontBody}`;
  ctx.fillText(strings.subtitle || "", PAD, footerY + 68);
  ctx.drawImage(qrImg, CARD_WIDTH - PAD - qrSize, footerY, qrSize, qrSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

/**
 * Greedy wrapper that handles CJK (breaks anywhere) and Latin (prefers the
 * last space on the line). Returns at most maxLines lines, last one ellipsized.
 */
function wrapText(ctx, text, font, maxWidth, maxLines) {
  if (!text) return [];
  ctx.font = font;
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      const lastSpace = line.lastIndexOf(" ");
      // Only rewind to a space when it's near the end — CJK lines rarely
      // contain spaces and should break at the overflowing character.
      if (/[A-Za-z0-9]/.test(ch) && lastSpace > line.length - 16) {
        lines.push(line.slice(0, lastSpace));
        line = line.slice(lastSpace + 1) + ch;
      } else {
        lines.push(line);
        line = ch === " " ? "" : ch;
      }
      if (lines.length === maxLines) {
        lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, "…");
        return lines;
      }
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatUtc(iso) {
  if (!iso) return "";
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

let toastEl = null;
let toastTimer = 0;

function toast(message) {
  if (!message) return;
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.setAttribute("role", "status");
    toastEl.style.cssText =
      "position:fixed;left:50%;bottom:2rem;transform:translateX(-50%);" +
      "background:var(--text);color:var(--bg);padding:0.5rem 1rem;" +
      "border-radius:0.375rem;font-size:0.8125rem;z-index:100;" +
      "opacity:0;transition:opacity 0.2s;pointer-events:none;";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.opacity = "0";
  }, 2200);
}
