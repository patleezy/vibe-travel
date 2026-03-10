export interface Destination {
  name: string;
  country: string;
  tagline: string;
  whyItFits: string;
  hiddenGemTip: string;
  bestTime: string;
  crowdLevel: 'low' | 'medium' | 'high';
  safetyStatus: 'green' | 'yellow' | 'red';
  safetyNote: string;
  costSignal: 'budget' | 'mid' | 'splurge';
  vibeEmoji: string;
  region: string;
}

export interface DiscoverResponse {
  destinations: Destination[];
  searchedFor?: string;
  error?: string;
}
