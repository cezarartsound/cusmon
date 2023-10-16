import { CSSProperties } from "react";

export const stringToColour = (str: string): Pick<CSSProperties, 'color'|'backgroundColor'> => {
  let hash = 0;
  str.split('').forEach(char => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  })
  const rgb = [0, 0, 0].map((_, i) => (hash >> (i * 8)) & 0xff)
  const luma = ((0.299 * rgb[0]) + (0.587 * rgb[1]) + (0.114 * rgb[2])) / 0xff;

  return {
    backgroundColor: `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`,
    color: luma > 0.5 ? '#000': '#FFF'
  }
}
