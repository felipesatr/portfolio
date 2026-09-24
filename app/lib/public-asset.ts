export function publicAsset(path: string): string {
  return `${import.meta.env.VITE_PORTFOLIO_BASE_PATH || import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
