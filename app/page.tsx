'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Play, Loader2, Settings, Share2, Type, Clock, X, Image as ImageIcon } from 'lucide-react';
import { VideoGenerator } from '../services/videoService';
import { TikTokService } from '../services/tikTokService';
import { AppStatus, TikTokConfig } from '../types';

const DEFAULT_TIKTOK_CONFIG: TikTokConfig = {
  accessToken: ''
};

export default function Home() {
  // --- State ---
  const [images, setImages] = useState<File[]>([]);
  const [overlayText, setOverlayText] = useState<string>('');
  const [frameDuration, setFrameDuration] = useState<number>(0.3);
  const [totalDuration, setTotalDuration] = useState<number>(10);
  const [fontSize, setFontSize] = useState<number>(60);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [showSettings, setShowSettings] = useState(false);
  const [tikTokConfig, setTikTokConfig] = useState<TikTokConfig>(DEFAULT_TIKTOK_CONFIG);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef<number>(0);

  // --- Handlers ---

  const resetGenerationState = useCallback(() => {
    setCurrentVideoUrl(null);
    setCurrentBlob(null);
    setStatus(AppStatus.IDLE);
  }, []);

  // Multi-image Paste Handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      const items = e.clipboardData.items;
      const newFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            newFiles.push(file);
          }
        }
      }

      if (newFiles.length > 0) {
        e.preventDefault();
        setImages(prev => [...prev, ...newFiles]);
        resetGenerationState();
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [resetGenerationState]);

  const handleUploadClick = () => {
    if (isDragging) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      resetGenerationState();
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    resetGenerationState();
  };

  const clearAllImages = () => {
    setImages([]);
    resetGenerationState();
  };

  // --- Drag & Drop Handlers ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter((file: File) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        setImages(prev => [...prev, ...validFiles]);
        resetGenerationState();
      }
    }
  };

  const handleGenerateVideo = async () => {
    if (images.length === 0) return;

    setStatus(AppStatus.GENERATING);
    setCurrentVideoUrl(null);
    setCurrentBlob(null);

    try {
      const generator = new VideoGenerator();
      const blob = await generator.generate({
        images,
        overlayText,
        frameDuration,
        totalDuration,
        fontSize
      });

      const localUrl = URL.createObjectURL(blob);
      setCurrentVideoUrl(localUrl);
      setCurrentBlob(blob);
      setStatus(AppStatus.SUCCESS);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      alert('Something went wrong during generation.');
    }
  };

  const handlePostToTikTok = async () => {
    if (!currentBlob) return;
    if (!tikTokConfig.accessToken) {
      alert('Please enter your TikTok Access Token in settings first.');
      setShowSettings(true);
      return;
    }

    setStatus(AppStatus.UPLOADING_TIKTOK);
    const tikTokService = new TikTokService(tikTokConfig);

    try {
      await tikTokService.uploadDraft(currentBlob, overlayText || 'My Brand Video');
      alert('Successfully uploaded to TikTok as Draft!');
      setStatus(AppStatus.SUCCESS);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      console.error('TikTok Upload Error:', e);
      alert(`Upload failed: ${errorMessage}. Note: Localhost uploading often fails due to CORS.`);
      setStatus(AppStatus.SUCCESS);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">

        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">TikGen Studio</h1>
            <p className="text-white/70 mt-3 text-lg md:text-xl">Generate branded loops & publish drafts</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-full transition-colors ${
              showSettings ? 'bg-surface-light' : 'bg-surface hover:bg-surface-light'
            }`}
            title="Settings"
          >
            <Settings className="w-6 h-6 text-white/70" />
          </button>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-surface border border-gray-800 p-6 rounded-xl mb-8 space-y-4">
            <h3 className="font-bold text-lg">TikTok Configuration</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-white/70">Access Token</label>
              <input
                type="password"
                className="w-full p-3 bg-surface-light border border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-white/20 outline-none text-white placeholder-white/40"
                value={tikTokConfig.accessToken}
                onChange={(e) => setTikTokConfig({ ...tikTokConfig, accessToken: e.target.value })}
                placeholder="Paste your TikTok API Access Token here..."
              />
              <p className="text-xs text-white/50 mt-2">
                Requires a developer account. Uploads will appear in your account drafts.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* 1. Image Upload Zone */}
          <section className="space-y-4">
            <div
              onClick={handleUploadClick}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-10 md:p-12 text-center transition-all cursor-pointer group relative ${
                isDragging
                  ? 'border-white bg-surface-light scale-[1.01]'
                  : 'border-gray-800 hover:border-white/50 hover:bg-surface'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="flex flex-col items-center space-y-4 pointer-events-none">
                <div className={`bg-white p-4 rounded-full transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <Upload className="w-8 h-8 text-black" />
                </div>
                <div>
                  <p className="font-bold text-xl text-white">
                    {isDragging ? 'Drop images to add!' : 'Upload Brand Photos'}
                  </p>
                  <p className="text-white/60 mt-2">
                    {images.length > 0
                      ? `${images.length} images selected (Click to add more)`
                      : 'Drag & drop, paste (Ctrl+V), or click to select'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Image Preview Strip */}
            {images.length > 0 && (
              <div className="bg-surface border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 text-white/70">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{images.length} images</span>
                  </div>
                  <button
                    onClick={clearAllImages}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto py-1 scrollbar-hide">
                  {images.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-800 group"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. Customization Panel */}
          <section className="bg-surface border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6">
            <label className="block text-sm font-bold text-white/50 uppercase tracking-wider">
              Customization
            </label>

            {/* Overlay Text Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Overlay Text</label>
              <input
                type="text"
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                placeholder="e.g. NEW COLLECTION DROP"
                className="w-full p-4 bg-surface-light border border-gray-800 rounded-xl focus:ring-2 focus:ring-white/20 outline-none text-white placeholder-white/40 font-medium"
              />
            </div>

            {/* Sliders Grid */}
            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              {/* Video Duration */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white/80 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Video Length
                  </span>
                  <span className="font-bold text-white">{totalDuration}s</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={totalDuration}
                  onChange={(e) => setTotalDuration(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Image Duration */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white/80">Image Duration</span>
                  <span className="font-bold text-white">{frameDuration}s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={frameDuration}
                  onChange={(e) => setFrameDuration(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-white/80 flex items-center gap-2">
                    <Type className="w-4 h-4" /> Font Size
                  </span>
                  <span className="font-bold text-white">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="5"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* 3. Action Buttons */}
          <section className="flex flex-col gap-4">
            <button
              onClick={handleGenerateVideo}
              disabled={status === AppStatus.GENERATING || status === AppStatus.UPLOADING_TIKTOK || images.length === 0}
              className="w-full py-4 bg-white hover:bg-white/90 disabled:bg-surface-light disabled:text-white/40 disabled:cursor-not-allowed text-black rounded-full font-bold text-lg shadow transition-all flex items-center justify-center gap-3"
            >
              {status === AppStatus.GENERATING ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play className="fill-current" />
              )}
              {status === AppStatus.GENERATING ? 'Rendering Video...' : 'Generate Video'}
            </button>

            {status === AppStatus.SUCCESS && currentBlob && (
              <button
                onClick={handlePostToTikTok}
                className="w-full py-4 bg-[#ff0050] hover:bg-[#d60043] text-white rounded-full font-bold text-lg shadow transition-all flex items-center justify-center gap-3"
              >
                <Share2 className="w-5 h-5" />
                Post Draft to TikTok
              </button>
            )}

            {status === AppStatus.UPLOADING_TIKTOK && (
              <div className="w-full py-4 bg-surface border border-gray-800 text-white/70 rounded-full font-bold text-lg flex items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[#ff0050]" />
                Uploading to TikTok...
              </div>
            )}
          </section>

          {/* 4. Video Preview */}
          {currentVideoUrl && (
            <section className="pt-6 border-t border-gray-800">
              <h3 className="text-center font-bold text-white/50 text-sm uppercase tracking-wider mb-6">
                Preview
              </h3>
              <div className="bg-surface border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative aspect-[9/16] max-w-[320px] mx-auto">
                <video
                  src={currentVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-cover"
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
