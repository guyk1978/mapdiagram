/**
 * Layout-aware label measurement for flowchart nodes.
 */

export interface LabelMeasure {
  width: number;
  height: number;
  lines: string[];
}

const CHAR_W = 7.2;
const LINE_H = 18;
const PAD_X = 28;
const PAD_Y = 22;

function wrapLines(text: string, maxWidthPx: number, maxLines = 3): string[] {
  const maxChars = Math.max(8, Math.floor((maxWidthPx - PAD_X) / CHAR_W));
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars - 1) + "…" : w;
    }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length > maxLines) return lines.slice(0, maxLines);
  return lines.length ? lines : [text.slice(0, maxChars)];
}

/**
 * Estimate node box from label text and kind constraints.
 */
export function measureFlowchartLabel(
  label: string,
  kind: "start" | "process" | "decision" | "end",
): LabelMeasure {
  const baseMax =
    kind === "decision" ? 200 : kind === "process" ? 220 : kind === "start" || kind === "end" ? 180 : 200;
  const minW = kind === "decision" ? 200 : kind === "start" || kind === "end" ? 150 : 170;
  const minH = kind === "decision" ? 120 : kind === "start" || kind === "end" ? 56 : 72;
  const maxH = kind === "decision" ? 168 : 120;

  const trimmed = label.trim();
  const short = trimmed.length <= 14;
  const maxW = short ? Math.max(minW, trimmed.length * CHAR_W + PAD_X) : baseMax;
  const lines = wrapLines(trimmed, maxW, short ? 2 : 3);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const width = Math.min(280, Math.max(minW, Math.ceil(longest * CHAR_W + PAD_X)));
  const height = Math.min(maxH, Math.max(minH, lines.length * LINE_H + PAD_Y));
  return { width, height, lines };
}
