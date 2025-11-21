import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, GeneratedVideo } from '../types';

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    this.config = config;
    // Validate URL format to prevent "Invalid URL" errors from Supabase client
    // while user is typing or if env vars are missing.
    const isValidUrl = (url: string) => {
      try {
        return url && url.startsWith('http');
      } catch {
        return false;
      }
    };

    if (isValidUrl(config.url) && config.key) {
      try {
        this.client = createClient(config.url, config.key);
      } catch (e) {
        console.warn("Failed to initialize Supabase client:", e);
        this.client = null;
      }
    }
  }

  isValid(): boolean {
    return !!this.client;
  }

  async uploadVideo(blob: Blob, title: string): Promise<GeneratedVideo> {
    if (!this.client) throw new Error("Supabase not configured");

    const timestamp = Date.now();
    // Sanitize title for filename
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
    const fileName = `${timestamp}_${safeTitle}.webm`;
    // Use folder structure if needed, here just root of bucket
    const filePath = `${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await this.client.storage
      .from(this.config.bucket)
      .upload(filePath, blob, {
        contentType: 'video/webm',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = this.client.storage
      .from(this.config.bucket)
      .getPublicUrl(filePath);

    // 3. Insert into Table (for history)
    const videoRecord: GeneratedVideo = {
        id: crypto.randomUUID(),
        title: title || 'Untitled Video',
        url: publicUrl,
        created_at: new Date().toISOString()
    };

    try {
        const { error: dbError } = await this.client
        .from(this.config.table)
        .insert([
            { 
                title: videoRecord.title, 
                storage_url: videoRecord.url, 
            }
        ]);
        
        if (dbError) {
            console.warn("Could not save to database (check table existence), but upload succeeded", dbError);
        }
    } catch (e) {
        console.warn("Database operation failed", e);
    }

    return videoRecord;
  }

  async fetchHistory(): Promise<GeneratedVideo[]> {
    if (!this.client) return [];
    
    try {
        const { data, error } = await this.client
        .from(this.config.table)
        .select('*')
        .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching history:", error);
            return [];
        }

        // Map Supabase result to our interface
        return data.map((item: any) => ({
            id: item.id,
            title: item.title,
            url: item.storage_url || item.url, 
            created_at: item.created_at
        }));
    } catch (e) {
        console.error("Failed to fetch history", e);
        return [];
    }
  }
}