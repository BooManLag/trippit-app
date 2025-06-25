// This file is kept for reference but we're not using WebView anymore
// since it's not available in the current Devvit API version

export type DevvitMessage =
  | { type: 'initialCityData'; data: Array<{ city: string; country: string; trip_count: number }> };

export type WebViewMessage = { type: 'webViewReady' };

export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  type?: 'devvit-message' | string;
};