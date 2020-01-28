export const tokenize = (str: string) => [
  ...new Set(
    str
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(" ")
      .filter(Boolean)
      .filter(s => /[a-z]/i.test(s))
      .filter(s => s.length > 1 || /^[0-9]+$/.test(s))
  )
];

export const tokenizeNames = (aliases: string[]) => [
  ...new Set(aliases.map(tokenize).flat())
];
