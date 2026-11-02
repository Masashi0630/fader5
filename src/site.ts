/** 公開 URL(.env の VITE_SITE_URL)。共有テキストの最終行に使う。空なら呼び出し側でページの URL を使う */
export const SITE_URL: string = import.meta.env.VITE_SITE_URL ?? '';
