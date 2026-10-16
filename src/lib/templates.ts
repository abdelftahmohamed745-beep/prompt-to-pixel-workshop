import type { Lang } from "./i18n";

export type SiteType = "landing" | "portfolio" | "store" | "blog";
export type Direction = "minimal" | "editorial" | "bold";

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const palettes: Record<Direction, { bg: string; ink: string; accent: string; font: string }> = {
  minimal: { bg: "#ffffff", ink: "#1a1a1a", accent: "#1a1a1a", font: "system-ui, sans-serif" },
  editorial: { bg: "#f4efe6", ink: "#2b2118", accent: "#9a3b1b", font: "Georgia, serif" },
  bold: { bg: "#111111", ink: "#f5f5f0", accent: "#d7ff64", font: "system-ui, sans-serif" },
};

const sections: Record<SiteType, { ar: string[]; en: string[] }> = {
  landing: { ar: ["المزايا", "الأسعار", "تواصل معنا"], en: ["Features", "Pricing", "Contact"] },
  portfolio: { ar: ["أعمال مختارة", "نبذة", "تواصل"], en: ["Selected work", "About", "Contact"] },
  store: { ar: ["المنتجات", "الشحن", "الأسئلة الشائعة"], en: ["Products", "Shipping", "FAQ"] },
  blog: { ar: ["أحدث المقالات", "التصنيفات", "النشرة البريدية"], en: ["Latest posts", "Topics", "Newsletter"] },
};

/** Builds a static starter template locally. This is NOT AI output. */
export function buildTemplate(opts: {
  name: string;
  description: string;
  type: SiteType;
  direction: Direction;
  lang: Lang;
}): Record<string, string> {
  const p = palettes[opts.direction];
  const dir = opts.lang === "ar" ? "rtl" : "ltr";
  const secs = sections[opts.type][opts.lang]
    .map(
      (s) =>
        `    <section>\n      <h2>${escapeHtml(s)}</h2>\n      <p>${opts.lang === "ar" ? "محتوى نموذجي — استبدله بمحتواك." : "Placeholder copy — replace with your content."}</p>\n    </section>`,
    )
    .join("\n");
  const html = `<!doctype html>
<html lang="${opts.lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.name)}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="top">
    <strong>${escapeHtml(opts.name)}</strong>
  </header>
  <main>
    <section class="hero">
      <h1>${escapeHtml(opts.name)}</h1>
      <p>${escapeHtml(opts.description)}</p>
      <a class="cta" href="#">${opts.lang === "ar" ? "ابدأ الآن" : "Get started"}</a>
    </section>
${secs}
  </main>
  <footer>© ${escapeHtml(opts.name)}</footer>
</body>
</html>
`;
  const css = `:root {
  --bg: ${p.bg};
  --ink: ${p.ink};
  --accent: ${p.accent};
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: ${p.font};
  background: var(--bg);
  color: var(--ink);
  line-height: 1.6;
}

.top, main, footer {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 24px;
}

.hero { padding: 64px 0 40px; }
.hero h1 { font-size: clamp(2rem, 6vw, 3.4rem); line-height: 1.1; margin: 0 0 16px; }
.hero p { max-width: 56ch; opacity: .8; }

.cta {
  display: inline-block;
  margin-top: 16px;
  padding: 12px 20px;
  background: var(--accent);
  color: var(--bg);
  text-decoration: none;
  border-radius: 6px;
}

section { padding: 24px 0; border-top: 1px solid color-mix(in srgb, var(--ink) 15%, transparent); }
footer { opacity: .6; font-size: 14px; }
`;
  const readme = `# ${opts.name}

${opts.description}

- Type: ${opts.type}
- Direction: ${opts.direction}

> Starter template generated locally by ForgeFE demo mode. No AI service produced these files.
`;
  return { "index.html": html, "styles.css": css, "README.md": readme };
}

/** Inline styles.css into index.html for the sandboxed preview. */
export function composePreview(files: Record<string, string>) {
  const html = files["index.html"];
  if (!html) return null;
  const css = files["styles.css"] ?? "";
  return html.replace(
    /<link rel="stylesheet" href="styles.css"\s*\/?>/,
    `<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`,
  );
}

/** The deterministic demo edit applied when a demo task completes. */
export function applyDemoEdit(html: string, prompt: string, lang: Lang) {
  const block = `    <section class="request">
      <h2>${lang === "ar" ? "طلب تجريبي" : "Demo request"}</h2>
      <p>${escapeHtml(prompt)}</p>
    </section>
`;
  if (html.includes("</main>")) return html.replace("  </main>", `${block}  </main>`);
  return html + block;
}
