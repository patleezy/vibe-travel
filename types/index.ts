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
  advisoryLevel?: 1 | 2 | 3 | 4;
  lat?: number;
  lng?: number;
}

export interface DiscoverResponse {
  destinations: Destination[];
  searchedFor?: string;
  error?: string;
}

export type DestinationTag = 'visited' | 'wishlist';

export interface TagEntry {
  tag: DestinationTag;
  name: string;
  country: string;
  vibeEmoji: string;
  region: string;
  tagline: string;
}

export type DestinationTags = Record<string, TagEntry>; // key = "name|country"

export interface SavedTrip {
  vibe: string;
  destinations: Destination[];
  searchedFor: string;
  savedAt?: number;
}
