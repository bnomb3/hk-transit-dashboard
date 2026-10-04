// Parses free-form departure times ("7:00, 07:30 8:15") into sorted, de-duplicated "HH:mm" strings.
// Tokens that are not valid 24-hour times are returned separately so the UI can flag them.
export function parseTimes(text) {
  const times = new Set();
  const invalid = [];
  for (const token of (text || "").split(/[\s,;]+/).filter(Boolean)) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(token);
    if (match && Number(match[1]) < 24 && Number(match[2]) < 60) {
      times.add(match[1].padStart(2, "0") + ":" + match[2]);
    } else {
      invalid.push(token);
    }
  }
  return { times: [...times].sort(), invalid };
}
