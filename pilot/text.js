// Shared text rules: the page and the validator must cut the text identically.
// Morgan's transcription marks Greek as "[Greek: word]" and footnotes as "[1]".
export function display(raw) {
  let out = '', last = 0, m; const greek = [];
  const re = /\[Greek: ([^\]]+)\]|\[\d+\]/g;
  while ((m = re.exec(raw))) {
    out += raw.slice(last, m.index);
    if (m[1]) { greek.push([out.length, out.length + m[1].length]); out += m[1]; }
    last = re.lastIndex;
  }
  return { text: out + raw.slice(last), greek };
}

// Sentence ranges [start, end) over display text.
export function sentences(text) {
  const out = []; let s = 0; const re = /[.!?]["”]?\s+(?=[A-Z"“])/g; let m;
  while ((m = re.exec(text))) { const e = m.index + m[0].trimEnd().length; out.push([s, e]); s = m.index + m[0].length; }
  if (s < text.length) out.push([s, text.length]);
  return out;
}

// A sentence carries a measure if it names a fraction, a count of parts, or a unit.
export const MEASURE = /\b(half|halves|thirds?|fourths?|quarters?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?|twelfths?|sixteenths?|eighteenths?|parts?|feet|foot|inch(es)?|equal to|equivalent to|same height|the same|twenty-four)\b/i;
