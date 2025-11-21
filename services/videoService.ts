import { VideoConfig } from '../types';

export class VideoGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    // TikTok/Shorts resolution 9:16
    this.canvas.width = 1080;
    this.canvas.height = 1920;
    const context = this.canvas.getContext('2d', { alpha: false }); // alpha: false for performance
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4' // Some browsers (Safari) might support this with MediaRecorder
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Fallback to default
  }

  private drawFrame(img: HTMLImageElement, text: string, fontSize: number) {
    const { width, height } = this.canvas;
    
    // Clear background (black)
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    // Draw Image (Cover fit)
    if (img) {
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        this.ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    // Draw Text Overlay
    if (text) {
      this.ctx.save();
      this.ctx.translate(width / 2, height / 2);
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Improved Font Stack for Emojis:
      // 1. Apple Color Emoji (Mac/iOS)
      // 2. Segoe UI Emoji (Windows 10/11)
      // 3. Noto Color Emoji (Google/Linux - loaded via index.html)
      // 4. Arial (Fallback)
      this.ctx.font = `bold ${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;
      
      this.ctx.lineJoin = 'round';
      this.ctx.miterLimit = 2;
      
      // Wrap text logic
      const words = text.split(' ');
      let line = '';
      const lines = [];
      const maxWidth = width - 100;
      // Line height relative to font size
      const lineHeight = fontSize * 1.25; 

      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = this.ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      // Draw lines centered
      const startY = -((lines.length - 1) * lineHeight) / 2;
      lines.forEach((l, i) => {
        const ly = startY + (i * lineHeight);
        
        // Stroke (Outline) - scale width with font size
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = Math.max(4, fontSize * 0.15); 
        this.ctx.strokeText(l, 0, ly);

        // Fill (White)
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(l, 0, ly);
      });

      this.ctx.restore();
    }
  }

  public async generate(config: VideoConfig): Promise<Blob> {
    if (config.images.length === 0) throw new Error('No images provided');

    // 1. Load all images
    const loadedImages = await Promise.all(config.images.map(this.loadImage));

    // 2. Initial draw to ensure canvas isn't empty when stream starts
    this.drawFrame(loadedImages[0], config.overlayText, config.fontSize);

    // 3. Setup MediaRecorder
    // captureStream argument is FPS hint
    const stream = this.canvas.captureStream(30); 
    const mimeType = this.getSupportedMimeType();
    
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    
    // Fix for Safari or browsers that might struggle with specific codecs
    let mediaRecorder: MediaRecorder;
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        console.warn(`Failed to create MediaRecorder with mimeType ${mimeType}, falling back to default.`);
        mediaRecorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        // Create final blob using the actual mime type the recorder ended up using
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'video/webm' });
        resolve(blob);
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        reject(e);
      };

      // Start recording
      mediaRecorder.start();

      // Animation Loop
      const startTime = performance.now();
      const totalDurationMs = config.totalDuration * 1000;
      const frameDurationMs = config.frameDuration * 1000;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        
        if (elapsed >= totalDurationMs) {
          mediaRecorder.stop();
          return;
        }

        // Calculate which image to show
        // Loop logic: (elapsed / frameDuration) % imageCount
        const imageIndex = Math.floor(elapsed / frameDurationMs) % loadedImages.length;
        this.drawFrame(loadedImages[imageIndex], config.overlayText, config.fontSize);

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    });
  }
}