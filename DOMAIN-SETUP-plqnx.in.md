# PLQNX domain launch checklist

Status: Prepared. Do not change canonical URLs or cut over the live site until `plqnx.in` is purchased and verified under the correct account.

## 1. Register the domain

Search `plqnx.in` at https://domains.cloudflare.com/. Registration availability and exact prices must be confirmed during checkout. Use your own/authorized contact and verify the registrant email. If Cloudflare cannot register this TLD, use a reputable .in registrar and delegate the domain to Cloudflare DNS if desired. You must complete payment and registration personally.

## 2. Verify ownership and configure GitHub Pages

After successful registration, verify domain ownership in GitHub if available (recommended to prevent takeover). GitHub Pages for `jarvis369-max/plqnx-website`: Settings → Pages → Custom domain → `plqnx.in` → Save. Configure domain on GitHub Pages BEFORE changing DNS.

## 3. Cloudflare DNS after GitHub Pages accepts custom domain

Create four `A` records with name `@` and content:
* 185.199.108.153
* 185.199.109.153
* 185.199.110.153
* 185.199.111.153

Also create `CNAME`: name `www`, target `jarvis369-max.github.io`. Use DNS only (gray cloud) initially to simplify GitHub SSL certificate issuance. Remove conflicting parked/default A/AAAA/CNAME records. Avoid wildcard DNS. Wait for GitHub's custom-domain health check to succeed; then enable Enforce HTTPS in Settings → Pages. DNS/certificates can take up to 24 hours.

## 4. Backend cutover: required before switching visitors

The Cloudflare Worker source is `backend/worker-v5.js` (actual deployed worker should be checked). It currently restricts CORS to `https://jarvis369-max.github.io`. Before linking the new live origin, modify backend CORS to permit BOTH `https://plqnx.in` and the legacy origin, and deploy via Cloudflare. Handle OPTIONS with the same allowlist. Otherwise the new-domain chat/demo will not work. Retain your existing D1 DB binding and secrets. Never copy secrets into the repository. Keep the current allowed origin until you verify migration.

## 5. SEO cutover only when HTTPS and chat work

* Change canonical URLs, og:url and WebSite structured-data URL in index.html and core.html from `https://jarvis369-max.github.io/plqnx-website/` to `https://plqnx.in/` (core.html accordingly).
* Update both sitemap.xml loc URLs to new https://plqnx.in/ URLs; update robots.txt Sitemap line.
* Test https://plqnx.in/, https://plqnx.in/core.html, https://www.plqnx.in/ redirect and HTTPS.
* In https://search.google.com/search-console create a **Domain** property plqnx.in and add Google's actual provided DNS TXT verification record in Cloudflare. Do not guess the token.
* Submit https://plqnx.in/sitemap.xml and request indexing of the homepage via URL Inspection. Indexing and rankings are never guaranteed.

Google and GitHub references:
* https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
* https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

Notes: The root-hosted robots.txt will work at plqnx.in/robots.txt, but the current project URL /plqnx-website/robots.txt does NOT govern the host root. SEO metadata currently intentionally points to the working GitHub Pages URL until the purchased domain is actually live. The sign-in system is invite-only and the current beta supports up to five registered accounts; search visibility does not make registration public.
