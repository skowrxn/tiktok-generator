export interface VideoConfig {
  images: File[];
  overlayText: string;
  topText?: string; // optional text at top (e.g., "sprawdź link w BIO")
  frameDuration: number; // seconds per image
  totalDuration: number; // seconds
  fontSize: number; // px
  audioUrl?: string; // base64 audio URL for background music
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  UPLOADING_TIKTOK = 'UPLOADING_TIKTOK',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface TikTokConfig {
  accessToken: string; // User must provide this from their developer portal
}

export interface SupabaseConfig {
  url: string;
  key: string;
  bucket: string;
  table: string;
}

export interface GeneratedVideo {
  id: string;
  title: string;
  url: string;
  created_at: string;
}