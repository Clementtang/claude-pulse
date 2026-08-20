/**
 * Share-as-image for timeline cards — "Editorial" design (design canvas
 * option A): Newsreader masthead with the pulse logo, double rule, serif
 * title, centered text block, footer with site domain + QR.
 *
 * Draws on an offscreen canvas instead of screenshotting the DOM:
 * deterministic layout and a fixed light palette regardless of viewer theme
 * (the shared image is brand identity, not a themed surface). Localized
 * strings arrive via data attributes on #timeline so this bundle stays
 * identical (and cacheable) across locales.
 */
import QRCode from "qrcode";

const SITE_DOMAIN = "claude-pulse.chatbot.tw";
const BODY_MAX_CHARS = 600;
const CARD_WIDTH = 640;
// Portrait card matching mainstream phone screens (9:19.5) so the shared
// image fills one screen; overflowing content grows the card instead.
const MIN_HEIGHT = Math.round((CARD_WIDTH * 19.5) / 9);
const SCALE = 2;
const PAD_X = 52;
const PAD_TOP = 56;
const PAD_BOTTOM = 52;

// Fixed light palette (site light-theme tokens in Base.astro). The share
// image deliberately ignores the viewer's dark mode — including the
// category colors, which have brighter dark variants on the site.
const C = {
  bg: "#faf9f0",
  text: "#1a1a1b",
  secondary: "#5c5a52",
  tertiary: "#9c9889",
  accent: "#d97757",
  border: "#e5e2d6",
};

const CAT_COLORS = {
  "claude-code": "#2563eb",
  platform: "#059669",
  research: "#7c3aed",
  industry: "#d97706",
  enterprise: "#dc2626",
};

// Pulse polyline from the site logo (HomePage.astro), 36×20 viewBox.
const LOGO_POINTS = [
  [0, 10],
  [6, 10],
  [9, 10],
  [12, 3],
  [15, 17],
  [18, 6],
  [21, 14],
  [24, 10],
  [28, 10],
  [36, 10],
];

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
    categoryColor: CAT_COLORS[card.dataset.category] || C.accent,
    // The visible .card-time is rewritten to a relative label ("6 小時前")
    // which would go stale inside a static image — rebuild from the UTC value.
    timeLabel: formatUtc(card.dataset.datetime),
    source: card.querySelector(".card-source")?.textContent.trim() || "",
    displayDate: card.dataset.displayDate || "",
    url: card.dataset.sharePath
      ? `${location.origin}${card.dataset.sharePath}`
      : `${location.origin}${location.pathname}#${card.id}`,
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

  const qrSize = 104;
  const qrDataUrl = await QRCode.toDataURL(data.url, {
    width: qrSize * SCALE,
    margin: 0,
    color: { dark: C.text, light: "#00000000" },
  });
  const qrImg = await loadImage(qrDataUrl);

  const contentWidth = CARD_WIDTH - PAD_X * 2;
  const measure = document.createElement("canvas").getContext("2d");

  const titleFont = `500 37px ${fontDisplay}`;
  const bodyFont = `400 18px ${fontBody}`;
  const titleLines = wrapText(measure, data.title, titleFont, contentWidth, 6);

  const titleLH = 50;
  const bodyLH = 33;

  // Masthead: logo row (24px tall) + gap + double rule.
  const mastheadH = 24 + 16 + 6;
  const footerH = qrSize;
  const bottomH = PAD_BOTTOM + footerH + 22 + 1;
  const contentTop = PAD_TOP + mastheadH + 24;

  // Category row (18) + gap + title + gap before body.
  const preBodyH = 18 + 26 + titleLines.length * titleLH + (data.body ? 26 : 0);
  const maxBodyLines = Math.floor(
    (MIN_HEIGHT - contentTop - bottomH - preBodyH - 24) / bodyLH,
  );
  const bodyLines = wrapText(
    measure,
    data.body,
    bodyFont,
    contentWidth,
    Math.max(maxBodyLines, 4),
  );

  const contentH = preBodyH + bodyLines.length * bodyLH;
  const cardHeight = Math.max(MIN_HEIGHT, contentTop + contentH + 24 + bottomH);
  const dividerY = cardHeight - PAD_BOTTOM - footerH - 22;
  const footerY = dividerY + 22;
  // Center the text block between masthead and footer divider.
  const slack = Math.max(0, dividerY - 24 - contentTop - contentH);
  const catY = contentTop + slack / 2;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * SCALE;
  canvas.height = cardHeight * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);
  ctx.textBaseline = "alphabetic";

  // Masthead: pulse logo + wordmark left, date right (vertically centered
  // on the 24px logo row).
  const rowMid = PAD_TOP + 12;
  drawLogo(ctx, PAD_X, PAD_TOP, 44, 24);
  ctx.textBaseline = "middle";
  ctx.fillStyle = C.text;
  ctx.font = `600 27px ${fontDisplay}`;
  ctx.fillText("Claude Pulse", PAD_X + 44 + 12, rowMid);
  ctx.font = `400 13px ${fontMono}`;
  ctx.fillStyle = C.tertiary;
  ctx.textAlign = "right";
  ctx.fillText(data.displayDate, CARD_WIDTH - PAD_X, rowMid);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Double rule: heavy line over hairline, newspaper masthead style.
  const ruleY = PAD_TOP + 24 + 16;
  ctx.fillStyle = C.text;
  ctx.fillRect(PAD_X, ruleY, contentWidth, 2);
  ctx.fillStyle = C.border;
  ctx.fillRect(PAD_X, ruleY + 5, contentWidth, 1);

  // Category row
  ctx.fillStyle = data.categoryColor;
  ctx.beginPath();
  ctx.arc(PAD_X + 4, catY + 9, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 14px ${fontBody}`;
  withLetterSpacing(ctx, "1.4px", () => {
    ctx.fillText(data.category.toUpperCase(), PAD_X + 16, catY + 14);
  });

  // Title (serif) + body
  const titleY = catY + 18 + 26;
  ctx.fillStyle = C.text;
  ctx.font = titleFont;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, PAD_X, titleY + 37 + i * titleLH);
  });
  const bodyY = titleY + titleLines.length * titleLH + (data.body ? 26 : 0);
  ctx.fillStyle = C.secondary;
  ctx.font = bodyFont;
  bodyLines.forEach((line, i) => {
    ctx.fillText(line, PAD_X, bodyY + 20 + i * bodyLH);
  });

  // Footer divider
  ctx.fillStyle = C.border;
  ctx.fillRect(PAD_X, dividerY, contentWidth, 1);

  // Footer: site + source left, QR right
  ctx.fillStyle = C.accent;
  ctx.font = `700 17px ${fontBody}`;
  ctx.fillText(SITE_DOMAIN, PAD_X, footerY + 30);
  ctx.fillStyle = C.tertiary;
  ctx.font = `400 13px ${fontMono}`;
  ctx.fillText(`${data.source} · ${data.timeLabel}`, PAD_X, footerY + 56);
  ctx.font = `400 13.5px ${fontBody}`;
  ctx.fillText(strings.subtitle || "", PAD_X, footerY + 80);
  ctx.drawImage(qrImg, CARD_WIDTH - PAD_X - qrSize, footerY, qrSize, qrSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

function drawLogo(ctx, x, y, w, h) {
  const sx = w / 36;
  const sy = h / 20;
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  LOGO_POINTS.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(x + px * sx, y + py * sy);
    else ctx.lineTo(x + px * sx, y + py * sy);
  });
  ctx.stroke();
}

// Canvas letterSpacing shipped in Chrome 99+/Safari 17.4+; degrade silently.
function withLetterSpacing(ctx, value, draw) {
  const prev = ctx.letterSpacing;
  try {
    ctx.letterSpacing = value;
  } catch {
    // property unsupported
  }
  draw();
  if (prev !== undefined) {
    try {
      ctx.letterSpacing = prev;
    } catch {
      // property unsupported
    }
  }
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
