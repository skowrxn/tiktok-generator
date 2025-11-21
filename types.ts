export interface VideoConfig {
  images: File[];
  overlayText: string;
  frameDuration: number; // seconds per image
  totalDuration: number; // seconds
  fontSize: number; // px
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