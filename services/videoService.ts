import { VideoConfig } from "../types";

export class VideoGenerator {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement("canvas");
        // TikTok/Shorts resolution 9:16
        this.canvas.width = 1080;
        this.canvas.height = 1920;
        const context = this.canvas.getContext("2d", { alpha: false }); // alpha: false for performance
        if (!context) throw new Error("Could not get canvas context");
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
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
            "video/mp4",
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return "";
    }

    private wrapText(text: string, fontSize: number): string[] {
        if (!text) return [];
        this.ctx.font = `bold ${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;
        const words = text.split(" ");
        let line = "";
        const lines = [];
        const maxWidth = this.canvas.width - 100;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + " ";
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        return lines;
    }

    private drawFrame(
        img: HTMLImageElement,
        lines: string[],
        topText: string | undefined,
        fontSize: number
    ) {
        const { width, height } = this.canvas;

        // Clear background (black)
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, width, height);

        // Draw Image (Cover fit)
        if (img) {
            const scale = Math.max(width / img.width, height / img.height);
            const x = width / 2 - (img.width / 2) * scale;
            const y = height / 2 - (img.height / 2) * scale;
            this.ctx.drawImage(
                img,
                x,
                y,
                img.width * scale,
                img.height * scale
            );
        }

        // Draw Top Text (centered at top)
        if (topText) {
            this.ctx.save();
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "top";

            const topFontSize = Math.round(fontSize * 0.5);
            this.ctx.font = `bold ${topFontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;

            this.ctx.lineJoin = "round";
            this.ctx.miterLimit = 2;

            const topY = 120;

            // Stroke (Outline)
            this.ctx.strokeStyle = "black";
            this.ctx.lineWidth = Math.max(3, topFontSize * 0.12);
            this.ctx.strokeText(topText, width / 2, topY);

            // Fill (White)
            this.ctx.fillStyle = "white";
            this.ctx.fillText(topText, width / 2, topY);

            this.ctx.restore();
        }

        // Draw Main Text Overlay (centered)
        if (lines.length > 0) {
            this.ctx.save();
            this.ctx.translate(width / 2, height / 2);
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            this.ctx.font = `bold ${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;

            this.ctx.lineJoin = "round";
            this.ctx.miterLimit = 2;

            const lineHeight = fontSize * 1.25;
            const startY = -((lines.length - 1) * lineHeight) / 2;

            lines.forEach((l, i) => {
                const ly = startY + i * lineHeight;

                // Stroke (Outline)
                this.ctx.strokeStyle = "black";
                this.ctx.lineWidth = Math.max(4, fontSize * 0.15);
                this.ctx.strokeText(l, 0, ly);

                // Fill (White)
                this.ctx.fillStyle = "white";
                this.ctx.fillText(l, 0, ly);
            });

            this.ctx.restore();
        }
    }

    public async generate(config: VideoConfig): Promise<Blob> {
        if (config.images.length === 0) throw new Error("No images provided");

        // 1. Load all images
        const loadedImages = await Promise.all(
            config.images.map(this.loadImage)
        );

        // Setup stream early (60fps) to ensure initial frame is captured
        const canvasStream = this.canvas.captureStream(60);

        const lines = this.wrapText(config.overlayText, config.fontSize);

        // 2. Initial draw
        this.drawFrame(loadedImages[0], lines, config.topText, config.fontSize);

        // 3. Setup audio if provided
        let audioContext: AudioContext | null = null;
        let audioDestination: MediaStreamAudioDestinationNode | null = null;
        let audioSource: AudioBufferSourceNode | null = null;

        if (config.audioUrl) {
            try {
                audioContext = new AudioContext();
                if (audioContext.state === "suspended") {
                    await audioContext.resume();
                }
                audioDestination = audioContext.createMediaStreamDestination();

                // Fetch and decode audio
                const response = await fetch(config.audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(
                    arrayBuffer
                );

                // Create source node
                audioSource = audioContext.createBufferSource();
                audioSource.buffer = audioBuffer;
                audioSource.connect(audioDestination);
            } catch (e) {
                console.warn("Failed to load audio:", e);
                audioContext = null;
                audioDestination = null;
            }
        }

        // 4. Setup MediaRecorder with combined stream
        let combinedStream: MediaStream;

        if (audioDestination) {
            // Combine video and audio tracks
            const videoTrack = canvasStream.getVideoTracks()[0];
            const audioTrack = audioDestination.stream.getAudioTracks()[0];
            combinedStream = new MediaStream([videoTrack, audioTrack]);
        } else {
            combinedStream = canvasStream;
        }

        const mimeType = this.getSupportedMimeType();
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

        let mediaRecorder: MediaRecorder;
        try {
            mediaRecorder = new MediaRecorder(combinedStream, options);
        } catch (e) {
            console.warn(
                `Failed to create MediaRecorder with mimeType ${mimeType}, falling back to default.`
            );
            mediaRecorder = new MediaRecorder(combinedStream);
        }

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        return new Promise((resolve, reject) => {
            mediaRecorder.onstop = () => {
                // Stop audio
                if (audioSource) {
                    try {
                        audioSource.stop();
                    } catch (e) {
                        // Already stopped
                    }
                }
                if (audioContext) {
                    audioContext.close();
                }

                const blob = new Blob(chunks, {
                    type: mediaRecorder.mimeType || "video/webm",
                });
                resolve(blob);
            };

            mediaRecorder.onerror = (e) => {
                console.error("MediaRecorder error:", e);
                if (audioSource) {
                    try {
                        audioSource.stop();
                    } catch (err) {
                        // Already stopped
                    }
                }
                if (audioContext) {
                    audioContext.close();
                }
                reject(e);
            };

            // Start audio playback
            if (audioSource) {
                audioSource.start(0);
            }

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

                const imageIndex =
                    Math.floor(elapsed / frameDurationMs) % loadedImages.length;
                this.drawFrame(
                    loadedImages[imageIndex],
                    lines,
                    config.topText,
                    config.fontSize
                );

                requestAnimationFrame(animate);
            };

            requestAnimationFrame(animate);
        });
    }
}
