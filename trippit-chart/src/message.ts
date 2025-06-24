export type DevvitMessage =
  | { type: 'initialCityData'; data: Array<{ city: string; country: string; trip_count: number }> };

export type WebViewMessage = { type: 'webViewReady' };

export type DevvitSystemMessage = {
  data: { message: DevvitMessage };
  type?: 'devvit-message' | string;
};
