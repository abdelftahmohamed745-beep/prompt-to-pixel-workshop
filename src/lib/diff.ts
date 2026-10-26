export type DiffLine = { type: "same" | "add" | "remove"; text: string; a?: number; b?: number };

/** Line-level LCS diff. Fine for the small files in projects. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) {
      const down = dp[i + 1]?.[j] ?? 0;
      const right = dp[i]?.[j + 1] ?? 0;
      const diag = dp[i + 1]?.[j + 1] ?? 0;
      dp[i]![j] = a[i] === b[j] ? diag + 1 : Math.max(down, right);
    }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const down = dp[i + 1]?.[j] ?? 0;
    const right = dp[i]?.[j + 1] ?? 0;
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i]!, a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (down >= right) {
      out.push({ type: "remove", text: a[i]!, a: i + 1 });
      i++;
    } else {
      out.push({ type: "add", text: b[j]!, b: j + 1 });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "remove", text: a[i]!, a: i + 1 });
    i++;
  }
  while (j < m) {
    out.push({ type: "add", text: b[j]!, b: j + 1 });
    j++;
  }
  return out;
}

export function diffStats(lines: DiffLine[]) {
  return { add: lines.filter((l) => l.type === "add").length, remove: lines.filter((l) => l.type === "remove").length };
}
