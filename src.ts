import { staticFile } from "remotion";
export const resolveSrc = (s?: string) =>
  !s ? "" : /^(https?:|blob:|data:|\/)/.test(s) ? s : staticFile(s);
