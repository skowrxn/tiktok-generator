import React, { useState, useRef } from 'react';
import { Upload, Play, Loader2, Settings, Share2, Type, Clock } from 'lucide-react';
import { VideoGenerator } from './services/videoService';
import { TikTokService } from './services/tikTokService';
import { AppStatus, TikTokConfig } from './types';

const DEFAULT_TIKTOK_CONFIG: TikTokConfig = {
  accessToken: ''
};

export default function App() {
  // --- State ---
  const [images, setImages] = useState<File[]>([]);
  const [overlayText, setOverlayText] = useState<string>('');
  const [frameDuration, setFrameDuration] = useState<number>(0.3);
  const [totalDuration, setTotalDuration] = useState<number>(10);
  const [fontSize, setFontSize] = useState<number>(80);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [showSettings, setShowSettings] = useState(false);
  const [tikTokConfig, setTikTokConfig] = useState<TikTokConfig>(DEFAULT_TIKTOK_CONFIG);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImages(Array.from(e.target.files));
      resetGenerationState();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Filter for images only to be safe
      const validFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (validFiles.length > 0) {
        setImages(validFiles);
        resetGenerationState();
      }
    }
  };

  const resetGenerationState = () => {
    setCurrentVideoUrl(null);
    setCurrentBlob(null);
    setStatus(AppStatus.IDLE);
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
      alert("Something went wrong during generation.");
    }
  };

  const handlePostToTikTok = async () => {
    if (!currentBlob) return;
    if (!tikTokConfig.accessToken) {
        alert("Please enter your TikTok Access Token in settings first.");
        setShowSettings(true);
        return;
    }

    setStatus(AppStatus.UPLOADING_TIKTOK);
    
    const tikTokService = new TikTokService(tikTokConfig);
    
    try {
        await tikTokService.uploadDraft(currentBlob, overlayText || "My Brand Video");
        alert("Successfully uploaded to TikTok as Draft!");
        setStatus(AppStatus.SUCCESS);
    } catch (e: any) {
        console.error("TikTok Upload Error:", e);
        alert(`Upload failed: ${e.message}. Note: Localhost uploading often fails due to CORS. Ensure your TikTok App is configured correctly.`);
        setStatus(AppStatus.SUCCESS); // Reset to allow retry
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans p-6 md:p-12 flex justify-center">
      
      {/* Main Container - Centered */}
      <div className="w-full max-w-3xl space-y-8 bg-white p-8 rounded-3xl shadow-xl">
          
          <header className="flex justify-between items-center border-b border-slate-100 pb-6">
            <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">TikGen Studio</h1>
                <p className="text-slate-500 mt-2 text-lg">Generate branded loops & publish drafts</p>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-full transition-colors ${showSettings ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
              title="Settings"
            >
              <Settings className="w-6 h-6 text-slate-600" />
            </button>
          </header>

          {/* Settings Modal / Inline */}
          {showSettings && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2">
              <h3 className="font-semibold text-lg">TikTok Configuration</h3>
              <div>
                  <label className="block text-sm font-medium mb-1 text-slate-600">Access Token</label>
                  <input 
                      type="password" 
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none"
                      value={tikTokConfig.accessToken}
                      onChange={(e) => setTikTokConfig({...tikTokConfig, accessToken: e.target.value})}
                      placeholder="Paste your TikTok API Access Token here..."
                  />
                  <p className="text-xs text-slate-400 mt-2">
                      Requires a developer account. Uploads will appear in your account drafts.
                  </p>
              </div>
            </div>
          )}

          {/* 1. Image Upload (Drag & Drop) */}
          <section className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group ${
                isDragging 
                  ? 'border-black bg-slate-100 scale-[1.01]' 
                  : 'border-slate-200 hover:border-black hover:bg-slate-50'
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
              <div className="flex flex-col items-center space-y-4">
                <div className={`bg-black p-4 rounded-full transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <Upload className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-800">
                    {isDragging ? "Drop it like it's hot!" : "Upload Brand Photos"}
                  </p>
                  <p className="text-slate-500">
                    {images.length > 0 
                      ? `${images.length} images ready` 
                      : 'Drag & drop images here, or click to select'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {/* Image Preview Strip */}
            {images.length > 0 && (
                <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide">
                    {images.map((file, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                            <img 
                                src={URL.createObjectURL(file)} 
                                alt="preview" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}
          </section>

          {/* 2. Customize */}
          <section className="space-y-6 bg-slate-50 p-6 rounded-2xl">
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Customization</label>
            
            <div className="grid gap-6">
                {/* Text Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Overlay Text</label>
                    <input 
                        type="text" 
                        value={overlayText}
                        onChange={(e) => setOverlayText(e.target.value)}
                        placeholder="e.g. NEW COLLECTION DROP"
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-black outline-none shadow-sm font-medium"
                    />
                </div>

                <div className="grid sm:grid-cols-2 gap-8">
                    {/* Video Duration Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                             <span className="font-medium text-slate-700 flex items-center gap-2"><Clock className="w-4 h-4"/> Video Length</span>
                             <span className="font-bold text-slate-900">{totalDuration}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="3" 
                            max="30" 
                            step="1" 
                            value={totalDuration}
                            onChange={(e) => setTotalDuration(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                    </div>

                    {/* Speed Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                             <span className="font-medium text-slate-700">Image Duration</span>
                             <span className="font-bold text-slate-900">{frameDuration}s</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="1.0" 
                            step="0.1" 
                            value={frameDuration}
                            onChange={(e) => setFrameDuration(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                    </div>

                    {/* Font Size Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                             <span className="font-medium text-slate-700 flex items-center gap-2"><Type className="w-4 h-4"/> Font Size</span>
                             <span className="font-bold text-slate-900">{fontSize}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="40" 
                            max="200" 
                            step="5" 
                            value={fontSize}
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                    </div>
                </div>
            </div>
          </section>

          {/* 3. Action Buttons */}
          <section className="pt-2 flex flex-col gap-3">
            <button 
              onClick={handleGenerateVideo}
              disabled={status === AppStatus.GENERATING || status === AppStatus.UPLOADING_TIKTOK || images.length === 0}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3"
            >
              {status === AppStatus.GENERATING ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
              {status === AppStatus.GENERATING ? 'Rendering Video...' : 'Generate Video'}
            </button>

            {/* Post to TikTok Button - Only shows after successful generation */}
            {status === AppStatus.SUCCESS && currentBlob && (
                <button 
                    onClick={handlePostToTikTok}
                    className="w-full py-4 bg-[#ff0050] hover:bg-[#d60043] text-white rounded-xl font-bold text-lg shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-3 animate-in slide-in-from-bottom-2"
                >
                    <Share2 className="w-5 h-5" />
                    Post Draft to TikTok
                </button>
            )}
             {status === AppStatus.UPLOADING_TIKTOK && (
                 <div className="w-full py-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-lg flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-[#ff0050]" />
                    Uploading to TikTok...
                 </div>
            )}
          </section>

          {/* 4. Preview */}
          {currentVideoUrl && (
            <div className="pt-6 border-t border-slate-100">
                <h3 className="text-center font-bold text-slate-400 text-sm uppercase mb-4">Preview</h3>
                <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-900 relative aspect-[9/16] max-w-[320px] mx-auto">
                    <video 
                        src={currentVideoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
          )}

      </div>
    </div>
  );
}