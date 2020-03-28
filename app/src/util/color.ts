import Color from "color";

export function ensureDarkColor(hex: string) {
  const col = Color(hex);
  if (col.value() > 50) {
    return Color(
      [col.hue(), col.saturationv(), col.value() - (col.value() - 30)],
      "hsv"
    ).hex();
  }
  return hex;
}
