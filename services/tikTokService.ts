import { TikTokConfig } from '../types';

export class TikTokService {
  private config: TikTokConfig;

  constructor(config: TikTokConfig) {
    this.config = config;
  }

  /**
   * Uploads a video to TikTok as a draft using the Direct Post API.
   * Note: In a real-world scenario, this usually requires a backend proxy to handle CORS 
   * and secure token storage, but this implements the client-side interface.
   */
  async uploadDraft(blob: Blob, title: string): Promise<void> {
    if (!this.config.accessToken) {
      throw new Error("TikTok Access Token is missing. Please configure it in settings.");
    }

    // 1. Initialize Upload
    // https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
    const initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
    
    const initResponse = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        post_info: {
          title: title,
          privacy_level: 'SELF_ONLY', // Draft/Private
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: blob.size,
          chunk_size: blob.size, // Uploading in one chunk for simplicity
          total_chunk_count: 1
        }
      })
    });

    if (!initResponse.ok) {
      const err = await initResponse.json();
      throw new Error(`TikTok Init Failed: ${err.error?.message || initResponse.statusText}`);
    }

    const initData = await initResponse.json();
    const uploadUrl = initData.data.upload_url;

    // 2. Upload Video Binary
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4', // TikTok expects container format usually, but webm might be converted
        'Content-Range': `bytes 0-${blob.size - 1}/${blob.size}`
      },
      body: blob
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload video data to TikTok");
    }

    // 3. No finalization needed for direct file upload type in v2 usually, 
    // but some flows require a check status. Assuming success if PUT works.
    return;
  }
}
