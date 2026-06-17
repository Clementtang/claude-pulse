# Email Subscription — Feasibility Assessment + Implementation Plan

Status: PLANNING ONLY (nothing implemented). Author: Claude (Opus 4.8). Date: 2026-06-17.

## TL;DR

Claude Pulse is a static Astro site on Cloudflare Pages with **no backend**. It already
publishes a working RSS feed at `/feed.xml`. The cheapest, lowest-maintenance way to add
email is to **point a SaaS newsletter tool at the existing RSS feed** (RSS-to-email
automation) and embed that tool's hosted signup form on the page. At ~68 users / 28 days,
this stays free for a long time. Building it on Cloudflare Workers is technically clean but
adds a subscriber database, an email vendor, double-opt-in flows, unsubscribe handling, and
deliverability ownership (SPF/DKIM/DMARC) — none of which the project currently carries.

**Recommendation: Option (a), Buttondown, RSS-to-email, single list, weekly digest for MVP.**

---

## 1. Feasibility — options matrix

The hard constraint: the site is static and the deploy pipeline is `git push main → GitHub
Actions → CF Pages`. There is no server to receive a form POST, no place to store a
subscriber list, and no process allowed to send mail. Any email feature must therefore live
**outside** the repo's runtime — either in a SaaS tool, or in net-new Cloudflare infra.

The project already has the one ingredient that makes this easy: a valid RSS feed
(`site/src/pages/feed.xml.js` → `/feed.xml`) that updates automatically whenever the
curation LaunchAgent pushes new items. RSS-to-email tools consume exactly that.

### Comparison matrix

| Dimension                            | (a) SaaS + RSS-to-email                                                                             | (b) Self-built on Cloudflare                                                                | (c) Hybrid                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Example stack**                    | Buttondown / Beehiiv / Kit (ConvertKit)                                                             | Workers + D1/KV + Resend + Worker Cron                                                      | CF-hosted form → SaaS list, or static form → CF Worker → SaaS send API |
| **Cost @ tiny scale**                | **Free** (see tier facts below)                                                                     | **~Free** infra; email vendor free tier (Resend 3k/mo, 100/day)                             | Free                                                                   |
| **Effort (MVP)**                     | **~2–4 h** (mostly account + DNS)                                                                   | **~2–4 days** (DB schema, opt-in flow, unsubscribe, cron parser, templates)                 | ~1–2 days                                                              |
| **Ongoing maintenance**              | **Minimal** — vendor owns sending & deliverability                                                  | **High** — you own bounce handling, list hygiene, deliverability, security                  | Medium                                                                 |
| **Multi-locale fit**                 | One feed today → one digest; per-locale needs N lists + N feeds (see §3)                            | Full control: subscriber row stores locale, template renders right summary                  | Same as the SaaS half                                                  |
| **Signup form on static Astro page** | Embed vendor's hosted form (iframe or `<form action=...>` POST to vendor) — trivial, no backend     | Need a Worker endpoint + client `fetch`; CORS, spam/bot protection (Turnstile)              | Worker endpoint forwards to SaaS                                       |
| **Double-opt-in / GDPR**             | **Built in** (Buttondown, Kit, MailerLite all support confirmed opt-in + unsubscribe + data export) | **You build it** — confirm-token emails, unsubscribe links, suppression list, data-deletion | Inherit from SaaS half                                                 |
| **Deliverability**                   | Vendor's warmed IPs + their SPF/DKIM; you add a DNS record if using a custom from-domain            | You own SPF/DKIM/DMARC for `chatbot.tw`; cold domain reputation risk                        | Vendor handles send                                                    |
| **PII exposure**                     | Emails live in vendor's DB, not in the public repo — good                                           | Subscriber emails sit in your D1/KV; you must secure + never log/commit them                | Vendor holds list                                                      |
| **Lock-in / portability**            | Low — all support CSV export of subscribers                                                         | None — it's your data                                                                       | Low                                                                    |

### Verified SaaS free-tier facts (web search, June 2026)

- **Buttondown** — Free plan: **up to 100 active subscribers**, real plan (not a trial).
  **RSS-to-email is included on the free tier**, can merge multiple feeds, supports automations
  and tag-based segmentation. Next tier ~$9/mo for 1,000 subs + custom domain.
  Sources: woodpecker.co, comparedge.com, mailtoolfinder.com (June 2026).
- **MailerLite** — Free plan **reduced to 250 active subscribers / 2,500 emails per month**
  as of the 2026-07-01 update. **RSS campaigns are EXCLUDED from the free tier** (paid only).
  Basic automations included (up to 3). → Weaker fit because RSS-to-email is the whole point.
  Sources: blog.groupmail.io, mailerlite.com/help (June 2026).
- **Beehiiv** — Free plan **up to 2,500 subscribers, unlimited sends**, BUT **automations are
  locked entirely on free** (no triggered/RSS sends), forced Beehiiv branding, no custom domain.
  RSS-to-send specifically not confirmed on free. → Generous list size, but the locked
  automation likely blocks the auto-digest use case. [PARTIALLY UNVERIFIED: whether any
  RSS/scheduled send works on Beehiiv free.]
  Sources: emailtooltester.com, sender.net (June 2026).
- **Kit (ConvertKit)** — Free plan **up to 10,000 subscribers** but **only 1 automation, 1 form,
  1 landing page**, Kit branding on every email, no visual automation builder on free.
  One automation may be enough for a single RSS digest. [UNVERIFIED: whether Kit's free single
  automation supports RSS-feed-triggered broadcasts specifically — needs confirmation in-app.]
  Sources: mailsoftly.com, sendx.io (June 2026).
- **Mailchimp RSS campaigns** — historically the classic RSS-to-email tool; current free-tier
  RSS support not re-verified here and Mailchimp's free tier has tightened repeatedly.
  [UNVERIFIED — not researched in depth; deprioritized vs Buttondown.]

### Verified facts relevant to Option (b)

- **MailChannels free Cloudflare Workers email is DEAD.** The free MailChannels API for CF
  Workers was terminated 2024-06-30 (fully off by 2024-08-31). The old "free email from a
  Worker with zero signup" trick no longer exists. A new MailChannels Email API account offers
  ~100 emails/day free but requires its own signup + domain auth.
  Sources: blog.mailchannels.com, support.mailchannels.com, Cloudflare community (verified).
- **Resend** free tier (May 2026): **3,000 emails/month, 100 emails/day, 1 verified domain,**
  30-day log retention. Pro $20–35/mo lifts the daily cap. Fine for this scale, but you still
  build everything around it.
  Sources: resend.com/blog/new-free-tier, automationatlas.io, tiergauge.com (verified).

So Option (b) is feasible and would also be near-free, but the cost is **engineering + ongoing
ownership**, not dollars. That trades directly against KISS.

---

## 2. Recommendation

**Adopt Option (a): a SaaS newsletter tool consuming the existing `/feed.xml`, with the
vendor's hosted signup form embedded on the site. Use Buttondown for the MVP.**

Rationale, weighed against the project's actual constraints:

1. **RSS already exists and auto-updates.** The expensive part of any email feature — a
   reliable, deduped, multi-locale content stream — is already solved and runs ~39×/week via
   the curation LaunchAgent. RSS-to-email is essentially free reuse of that work.
2. **KISS + no backend.** Option (b) reintroduces a backend (subscriber store, send logic,
   opt-in/unsubscribe, deliverability) into a project whose entire architecture is "static site,
   no server." That is a large, permanent maintenance surface for a feature serving ~68 users.
3. **Cost sensitivity.** Buttondown free covers 100 subs with RSS-to-email _on the free tier_.
   At current scale that is comfortably $0, and the upgrade cliff (~$9/mo at 1,000 subs) is far
   away. Even MailerLite's tightened 250-sub free tier would cover today's audience — but it
   excludes RSS on free, so it's the wrong tool.
4. **Privacy.** Subscriber emails never enter the public GitHub repo or the build pipeline — they
   live in the vendor's database. That is strictly safer than storing a list in CF D1/KV that the
   same person administers and might accidentally log.
5. **Deliverability is not a hobby.** Inbox placement, SPF/DKIM/DMARC, bounce/complaint handling,
   and IP warming are real, ongoing work. Letting a vendor own them is the right call at this scale.

**Why Buttondown over the alternatives:** it is the only researched tool that puts
**RSS-to-email on the free tier** AND has a low list cap that is irrelevant at 68 users, with a
clean upgrade path. Kit (10k subs free) is attractive on list size but its single-automation /
RSS support on free is [UNVERIFIED] and its UI is heavier. Beehiiv locks automations on free.
MailerLite excludes RSS on free.

**Fallback if Buttondown's RSS behavior disappoints:** Kit (ConvertKit) free, pending in-app
confirmation that its one allowed automation can be RSS-triggered.

---

## 3. Key design decisions to resolve (with recommendations)

1. **Cadence: per-item vs digest.**
   - The curation agent posts multiple items most days; per-item email would be noisy and could
     trip volume limits.
   - **Recommend: weekly digest** (e.g. Monday) for MVP. Optionally a daily digest later. Avoid
     per-item entirely. (Most RSS-to-email tools let you set "send a digest of new items every N.")

2. **One list vs five per-locale lists.**
   - The current `/feed.xml` is **zh-Hant only** (it serves `item.summary`, which is the zh-TW log
     text; `customData` declares `zh-Hant`). So a naive single RSS-to-email digest would email
     everyone Traditional Chinese regardless of their site language.
   - Options:
     - **MVP: one list, zh-TW digest only**, clearly labeled on the signup form as Traditional
       Chinese. Simplest; matches the default locale and the existing feed. Lowest effort.
     - **Phase 2: per-locale feeds + per-locale lists.** Generate `/feed.{locale}.xml` for each of
       the 5 locales (the summaries already exist in `site/src/i18n/summaries-{en,zh-CN,ja,ko}.json`
       and the zh-TW log), then create one Buttondown list/feed per locale and one signup form per
       locale page. This is the "right" multi-locale answer but multiplies feeds, lists, and forms.
   - **Recommend: MVP single zh-TW list; design feed filenames now so Phase 2 is additive.**

3. **Where the signup form lives in the UI.**
   - Natural homes: (i) next to the existing RSS link in `.header-meta`, or (ii) a slim block in
     the `.footer` of `HomePage.astro`. The footer is the conventional newsletter spot and avoids
     crowding the masthead.
   - **Recommend: a compact "Subscribe by email" form in the footer**, mirroring the RSS link's
     understated mono-uppercase styling so it fits the editorial design. Add an i18n string key
     (`subscribe`, `subscribePlaceholder`, `subscribeCta`) to all 5 locale JSONs.

4. **Avoid leaking subscriber PII (privacy-sensitive).**
   - Never store emails in the repo, never log them in CI, never echo them in the curation logs.
   - With Option (a) this is automatic — the list lives in Buttondown. The only thing in the repo
     is the public embed/form HTML (no secrets).
   - If a custom from-address on `chatbot.tw` is used, the DNS records (SPF/DKIM) are public and
     fine to document; the **API key is a secret** and must live only in the vendor dashboard /
     local env, never committed.
   - Use **double opt-in** (confirmed subscribe) and a working **unsubscribe** link — both are
     standard in Buttondown and satisfy GDPR/CAN-SPAM expectations. Add a one-line privacy note
     near the form ("we only store your email to send the digest; unsubscribe anytime").

---

## 4. Implementation plan (Option (a), Buttondown)

### Human-only setup steps (cannot be automated from this repo) — flagged

- [ ] **H1. Create a Buttondown account** and a newsletter for Claude Pulse.
- [ ] **H2. Connect the RSS feed** `https://claude-pulse.chatbot.tw/feed.xml` as an RSS-to-email
      source; configure the digest cadence (weekly recommended) and the email template (subject,
      header, footer with unsubscribe).
- [ ] **H3. Enable double opt-in (confirmed subscriptions)** in Buttondown settings.
- [ ] **H4. (Optional) Custom from-domain.** If sending as `pulse@chatbot.tw` instead of a
      Buttondown subdomain, add the **SPF / DKIM (and DMARC)** DNS records Buttondown provides to
      the `chatbot.tw` DNS zone (Cloudflare DNS). DNS change = human step. Verify in Buttondown.
- [ ] **H5. Capture the hosted form action URL / embed snippet** from Buttondown and hand it to the
      code step below. (No API key needs to be embedded for a plain subscribe form.)
- [ ] **H6. Send a test confirmation + test digest to yourself** before announcing.

### Repo code changes (specific files)

All changes are additive and respect the static-site model (no new runtime).

1. **`site/src/components/HomePage.astro`** — add a subscribe form block in the `.footer`
   (around lines 182–198). A plain HTML `<form method="post" action="<buttondown-form-url>">`
   with an email input + submit button, styled to match the existing `.rss-link` /
   `.lang-pill` mono-uppercase aesthetic. Add matching CSS in the component's `<style>` block.
   Use `t.subscribe*` strings so it localizes.

2. **`site/src/i18n/en.json`, `zh-TW.json`, `zh-CN.json`, `ja.json`, `ko.json`** — add
   `subscribe`, `subscribePlaceholder`, `subscribeCta`, and `subscribeNote` (privacy line) keys
   to each. (5 files.) Translations should follow the project's zh-TW Taiwan-vocabulary rules.

3. **(No change needed to `feed.xml.js` for MVP.)** The existing feed already drives the digest.

4. **(Phase 2 only) Per-locale feeds.** Add `site/src/pages/feed.[locale].xml.js` (or a single
   dynamic route) that emits one feed per locale using `item.summaries?.[locale]` with a fallback,
   mirroring the existing `feed.xml.js`. Then per-locale lists + per-locale form actions in the
   localized pages. Defer until/if multi-locale email demand appears.

5. **Docs:** record the chosen vendor, list/feed IDs, cadence, and any DNS records added, in this
   plan file or project memory once live (per the project's "deployment done" definition — keep
   templates/IaC and docs in sync; here that means documenting the DNS records and form URL).

### Effort estimate

| Phase                              | Work                                             | Estimate              |
| ---------------------------------- | ------------------------------------------------ | --------------------- |
| Human setup (H1–H6)                | Account, RSS connect, opt-in, optional DNS, test | **1–2 h**             |
| Code MVP (steps 1–2)               | Footer form + 5 i18n files + styling             | **1–2 h**             |
| Review + verify deliverability     | Test send, inbox check, mobile layout            | **~1 h**              |
| **MVP total**                      |                                                  | **~3–5 h wall-clock** |
| Phase 2 (per-locale feeds + lists) | If pursued later                                 | **+0.5–1 day**        |

### Phased rollout

- **Phase 0 (now):** This assessment. No code.
- **Phase 1 (MVP):** Single zh-TW weekly digest via Buttondown free + footer form on all pages
  (form labeled "Traditional Chinese digest" or localized equivalent). Ship, verify a real test
  subscription end-to-end (confirm email → receives digest → unsubscribe works).
- **Phase 2 (if demand):** Per-locale feeds + per-locale lists/forms.
- **Phase 3 (only if it outgrows free):** Re-evaluate paid tier or revisit Option (b).

### Risks & mitigations

| Risk                                                              | Likelihood                | Impact | Mitigation                                                                             |
| ----------------------------------------------------------------- | ------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Buttondown free RSS behavior/limits change                        | Med                       | Med    | All tiers export CSV; portable. Re-verify tier before launch; Kit as fallback.         |
| Single feed is zh-TW only → non-zh subscribers get wrong language | High (if marketed to all) | Med    | MVP: label the form as zh-TW digest. Phase 2 adds per-locale feeds.                    |
| Deliverability / spam folder                                      | Med                       | Med    | Use double opt-in, vendor-warmed IPs; optional custom-domain SPF/DKIM/DMARC (H4).      |
| Spam/bot signups on a public static form                          | Med                       | Low    | Buttondown double opt-in filters most; enable any vendor captcha; monitor list growth. |
| PII leak via repo/CI/logs                                         | Low                       | High   | List lives in vendor only; never commit emails; API key (if any) stays out of repo.    |
| Free-tier subscriber cap hit (100 for Buttondown)                 | Low (at 68/28d)           | Low    | Far from cap; upgrade ~$9/mo or switch to Kit (10k free) if it ever approaches.        |
| Vendor lock-in                                                    | Low                       | Low    | CSV export supported everywhere.                                                       |

### Why NOT Option (b) for now (explicit)

Building Workers + D1 + Resend would be near-free in dollars but would add: a subscriber schema,
a signup Worker endpoint with bot protection, a confirm-token double-opt-in flow, an unsubscribe
endpoint + suppression list, a cron Worker that parses the RSS/log and renders per-locale emails,
email templating, and ownership of SPF/DKIM/DMARC + bounce handling. That is multiple days of
build plus permanent maintenance and a new PII-bearing datastore — disproportionate for ~68 users
and contrary to KISS. Revisit only if the SaaS route proves limiting.

---

## Sources (verified June 2026)

- Buttondown free tier + RSS: woodpecker.co/blog/buttondown, comparedge.com/tools/buttondown/pricing, mailtoolfinder.com/pricing/buttondown
- MailerLite 2026 free-tier change (250 subs, RSS excluded): blog.groupmail.io/mailerlite-free-plan-limits, mailerlite.com/help/free-plan-update-faq
- Beehiiv free plan (2,500 subs, automations locked): emailtooltester.com/en/reviews/beehiiv/pricing, sender.net/reviews/beehiiv/pricing
- Kit (ConvertKit) free plan (10k subs, 1 automation): mailsoftly.com/blog/kit-free-plan, sendx.io/blog/convertkit-pricing
- Resend free tier (3k/mo, 100/day): resend.com/blog/new-free-tier, automationatlas.io/answers/resend-free-tier-explained-2026, tiergauge.com/tools/resend
- MailChannels Cloudflare Workers EOL (2024): blog.mailchannels.com, support.mailchannels.com/hc/en-us/articles/26814255454093

[UNVERIFIED] flags: Beehiiv RSS-on-free behavior; Kit single-automation RSS-trigger support; Mailchimp current free RSS support (not researched in depth).
