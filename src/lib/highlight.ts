export type Token = { t: "plain" | "tag" | "attr" | "string" | "comment" | "keyword" | "punct"; v: string };

const rules: Record<string, [RegExp, Token["t"]][]> = {
  html: [
    [/^<!--[\s\S]*?-->/, "comment"],
    [/^<\/?[a-zA-Z!][\w-]*/, "tag"],
    [/^\/?>/, "tag"],
    [/^"[^"]*"/, "string"],
    [/^[a-zA-Z-:]+(?==)/, "attr"],
  ],
  css: [
    [/^\/\*[\s\S]*?\*\//, "comment"],
    [/^--?[a-zA-Z-]+(?=\s*:)/, "attr"],
    [/^"[^"]*"/, "string"],
    [/^#[0-9a-fA-F]{3,8}\b/, "string"],
    [/^[.#]?[a-zA-Z][\w-]*(?=[^;{}]*\{)/, "tag"],
    [/^[{}:;]/, "punct"],
  ],
  md: [
    [/^#{1,6} .*/, "keyword"],
    [/^> .*/, "comment"],
    [/^- /, "punct"],
  ],
};

export function langOf(path: string) {
  const ext = path.split(".").pop() ?? "";
  return ext === "html" ? "html" : ext === "css" ? "css" : ext === "md" ? "md" : "plain";
}

/** Small regex tokenizer per line; unknown languages render as plain text. */
export function tokenizeLine(line: string, lang: string): Token[] {
  const rs = rules[lang];
  if (!rs) return [{ t: "plain", v: line }];
  const out: Token[] = [];
  let rest = line;
  let plain = "";
  while (rest.length) {
    let hit = false;
    for (const [re, t] of rs) {
      const m = rest.match(re);
      if (m && m[0].length) {
        if (plain) out.push({ t: "plain", v: plain }), (plain = "");
        out.push({ t, v: m[0] });
        rest = rest.slice(m[0].length);
        hit = true;
        break;
      }
    }
    if (!hit) {
      plain += rest[0];
      rest = rest.slice(1);
    }
  }
  if (plain) out.push({ t: "plain", v: plain });
  return out;
}
