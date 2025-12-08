"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Upload,
    Play,
    Loader2,
    Type,
    Clock,
    X,
    Image as ImageIcon,
    Shuffle,
    Menu,
    ChevronLeft,
    RefreshCw,
} from "lucide-react";
import { VideoGenerator } from "../services/videoService";
import { AppStatus } from "../types";
import {
    db,
    ImageAsset,
    MusicAsset,
    TextAsset,
    EmojiAsset,
} from "../lib/instantdb";
import MediaLibrary from "../components/MediaLibrary";

export default function Home() {
    // --- State ---
    const [images, setImages] = useState<File[]>([]);
    const [overlayText, setOverlayText] = useState<string>("");
    const [topText, setTopText] = useState<string>("sprawdź link w BIO");
    const [frameDuration, setFrameDuration] = useState<number>(0.3);
    const [totalDuration, setTotalDuration] = useState<number>(10);
    const [fontSize, setFontSize] = useState<number>(60);
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
    const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedMusic, setSelectedMusic] = useState<MusicAsset | null>(null);
    const [selectedEmoji, setSelectedEmoji] = useState<EmojiAsset | null>(null);
    const [emojiCount, setEmojiCount] = useState<1 | 3>(1);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef<number>(0);

    // Query library assets for randomization
    const { data: libraryData } = db.useQuery({
        images: {},
        music: {},
        texts: {},
        emojis: {},
    });

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
                if (item.kind === "file" && item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                        newFiles.push(file);
                    }
                }
            }

            if (newFiles.length > 0) {
                e.preventDefault();
                setImages((prev) => [...prev, ...newFiles]);
                resetGenerationState();
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => {
            window.removeEventListener("paste", handlePaste);
        };
    }, [resetGenerationState]);

    const handleUploadClick = () => {
        if (isDragging) return;
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setImages((prev) => [...prev, ...newFiles]);
            resetGenerationState();
        }
    };

    const removeImage = (indexToRemove: number) => {
        setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
        resetGenerationState();
    };

    const clearAllImages = () => {
        setImages([]);
        resetGenerationState();
    };

    // Convert base64 to File
    const base64ToFile = async (
        base64: string,
        filename: string
    ): Promise<File> => {
        const res = await fetch(base64);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
    };

    // Randomize from library
    const handleRandomize = async () => {
        const libraryImages = libraryData?.images || [];
        const libraryMusic = libraryData?.music || [];
        const libraryTexts = libraryData?.texts || [];

        if (libraryImages.length === 0) {
            alert("Dodaj najpierw zdjęcia do biblioteki zasobów!");
            return;
        }

        // Shuffle and pick up to 8 random images
        const shuffledImages = [...libraryImages].sort(
            () => Math.random() - 0.5
        );
        const selectedImages = shuffledImages.slice(
            0,
            Math.min(8, shuffledImages.length)
        );

        // Convert base64 images to Files
        const imageFiles: File[] = [];
        for (const img of selectedImages) {
            try {
                const file = await base64ToFile(img.url, img.name);
                imageFiles.push(file);
            } catch (err) {
                console.error("Error converting image:", err);
            }
        }

        setImages(imageFiles);

        // Random music
        if (libraryMusic.length > 0) {
            const randomMusic =
                libraryMusic[Math.floor(Math.random() * libraryMusic.length)];
            setSelectedMusic(randomMusic);
        }

        // Random text
        if (libraryTexts.length > 0) {
            const randomText =
                libraryTexts[Math.floor(Math.random() * libraryTexts.length)];
            setOverlayText(randomText.content);
        }

        resetGenerationState();
    };

    // Randomize only text from library
    const handleRandomizeText = () => {
        const libraryTexts = libraryData?.texts || [];
        if (libraryTexts.length === 0) {
            alert("Dodaj najpierw teksty do biblioteki zasobów!");
            return;
        }
        const randomText =
            libraryTexts[Math.floor(Math.random() * libraryTexts.length)];
        setOverlayText(randomText.content);
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
                file.type.startsWith("image/")
            );
            if (validFiles.length > 0) {
                setImages((prev) => [...prev, ...validFiles]);
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
                topText,
                frameDuration,
                totalDuration,
                fontSize,
                audioUrl: selectedMusic?.url,
                emojiUrl: selectedEmoji?.url,
                emojiCount: selectedEmoji ? emojiCount : undefined,
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

    return (
        <div className="min-h-screen bg-black text-white font-sans flex">
            {/* Sidebar */}
            <aside
                className={`${
                    sidebarOpen ? "w-72" : "w-0"
                } transition-all duration-300 overflow-hidden flex-shrink-0`}
            >
                <MediaLibrary />
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-h-screen overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
                    {/* Header */}
                    <header className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-lg bg-surface hover:bg-surface-light transition-colors"
                                title={
                                    sidebarOpen
                                        ? "Ukryj sidebar"
                                        : "Pokaż sidebar"
                                }
                            >
                                {sidebarOpen ? (
                                    <ChevronLeft className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </button>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                    TikGen Studio
                                </h1>
                                <p className="text-white/70 mt-2 text-base md:text-lg">
                                    Generuj branded loops
                                </p>
                            </div>
                        </div>
                    </header>

                    <div className="space-y-8">
                        {/* Randomize Button */}
                        <button
                            onClick={handleRandomize}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3"
                        >
                            <Shuffle className="w-5 h-5" />
                            Losuj z biblioteki
                        </button>

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
                                        ? "border-white bg-surface-light scale-[1.01]"
                                        : "border-gray-800 hover:border-white/50 hover:bg-surface"
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
                                    <div
                                        className={`bg-white p-4 rounded-full transition-transform ${
                                            isDragging
                                                ? "scale-110"
                                                : "group-hover:scale-110"
                                        }`}
                                    >
                                        <Upload className="w-8 h-8 text-black" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xl text-white">
                                            {isDragging
                                                ? "Upuść zdjęcia tutaj!"
                                                : "Dodaj zdjęcia"}
                                        </p>
                                        <p className="text-white/60 mt-2">
                                            {images.length > 0
                                                ? `${images.length} zdjęć (kliknij aby dodać więcej)`
                                                : "Przeciągnij, wklej (Ctrl+V) lub kliknij"}
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
                                            <span className="text-sm font-medium">
                                                {images.length} zdjęć
                                            </span>
                                        </div>
                                        <button
                                            onClick={clearAllImages}
                                            className="text-sm text-white/50 hover:text-white transition-colors"
                                        >
                                            Wyczyść
                                        </button>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto py-1 scrollbar-hide">
                                        {images.map((file, idx) => (
                                            <div
                                                key={idx}
                                                className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-800 group"
                                            >
                                                <img
                                                    src={URL.createObjectURL(
                                                        file
                                                    )}
                                                    alt={`preview ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeImage(idx);
                                                    }}
                                                    className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    title="Usuń"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selected Music */}
                            {selectedMusic && (
                                <div className="bg-surface border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                                        <span className="text-lg">🎵</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white/50">
                                            Wybrana muzyka
                                        </p>
                                        <p className="text-white font-medium truncate">
                                            {selectedMusic.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMusic(null)}
                                        className="p-2 hover:bg-surface-light rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white/50" />
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* 2. Customization Panel */}
                        <section className="bg-surface border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6">
                            <label className="block text-sm font-bold text-white/50 uppercase tracking-wider">
                                Ustawienia
                            </label>

                            {/* Top Text Input (optional) */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Tekst na górze{" "}
                                    <span className="text-white/40">
                                        (opcjonalny)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={topText}
                                    onChange={(e) => setTopText(e.target.value)}
                                    placeholder="np. sprawdź link w BIO"
                                    className="w-full p-4 bg-surface-light border border-gray-800 rounded-xl focus:ring-2 focus:ring-white/20 outline-none text-white placeholder-white/40 font-medium"
                                />
                            </div>

                            {/* Main Overlay Text Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Główny tekst
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={overlayText}
                                        onChange={(e) =>
                                            setOverlayText(e.target.value)
                                        }
                                        placeholder="np. NOWA KOLEKCJA"
                                        className="flex-1 p-4 bg-surface-light border border-gray-800 rounded-xl focus:ring-2 focus:ring-white/20 outline-none text-white placeholder-white/40 font-medium"
                                    />
                                    <button
                                        onClick={handleRandomizeText}
                                        title="Losuj tekst z biblioteki"
                                        className="px-4 bg-surface-light border border-gray-800 rounded-xl hover:bg-surface hover:border-white/30 transition-colors"
                                    >
                                        <RefreshCw className="w-5 h-5 text-white/70" />
                                    </button>
                                </div>
                            </div>

                            {/* Emoji Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/80">
                                    Emoji (opcjonalne)
                                </label>
                                <div className="flex gap-3 items-center">
                                    {/* Emoji picker */}
                                    <div className="flex-1 flex gap-2 overflow-x-auto py-1">
                                        <button
                                            onClick={() =>
                                                setSelectedEmoji(null)
                                            }
                                            className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                selectedEmoji === null
                                                    ? "border-white bg-surface-light"
                                                    : "border-gray-700 hover:border-white/50"
                                            }`}
                                        >
                                            <X className="w-5 h-5 text-white/50" />
                                        </button>
                                        {(libraryData?.emojis || [])
                                            .sort(
                                                (
                                                    a: EmojiAsset,
                                                    b: EmojiAsset
                                                ) => b.createdAt - a.createdAt
                                            )
                                            .map((emoji: EmojiAsset) => (
                                                <button
                                                    key={emoji.id}
                                                    onClick={() =>
                                                        setSelectedEmoji(emoji)
                                                    }
                                                    className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 overflow-hidden transition-all ${
                                                        selectedEmoji?.id ===
                                                        emoji.id
                                                            ? "border-white scale-105"
                                                            : "border-gray-700 hover:border-white/50"
                                                    }`}
                                                >
                                                    <img
                                                        src={emoji.url}
                                                        alt={emoji.name}
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                </button>
                                            ))}
                                    </div>
                                    {/* Emoji count selector */}
                                    {selectedEmoji && (
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => setEmojiCount(1)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    emojiCount === 1
                                                        ? "bg-white text-black"
                                                        : "bg-surface-light text-white/70 hover:text-white"
                                                }`}
                                            >
                                                1x
                                            </button>
                                            <button
                                                onClick={() => setEmojiCount(3)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    emojiCount === 3
                                                        ? "bg-white text-black"
                                                        : "bg-surface-light text-white/70 hover:text-white"
                                                }`}
                                            >
                                                3x
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {(libraryData?.emojis || []).length === 0 && (
                                    <p className="text-xs text-white/40">
                                        Dodaj grafiki emoji w bibliotece zasobów
                                    </p>
                                )}
                            </div>

                            {/* Sliders Grid */}
                            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
                                {/* Video Duration */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-white/80 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />{" "}
                                            Długość wideo
                                        </span>
                                        <span className="font-bold text-white">
                                            {totalDuration}s
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="3"
                                        max="30"
                                        step="1"
                                        value={totalDuration}
                                        onChange={(e) =>
                                            setTotalDuration(
                                                parseInt(e.target.value)
                                            )
                                        }
                                        className="w-full"
                                    />
                                </div>

                                {/* Image Duration */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-white/80">
                                            Czas zdjęcia
                                        </span>
                                        <span className="font-bold text-white">
                                            {frameDuration}s
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1.0"
                                        step="0.1"
                                        value={frameDuration}
                                        onChange={(e) =>
                                            setFrameDuration(
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="w-full"
                                    />
                                </div>

                                {/* Font Size */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-white/80 flex items-center gap-2">
                                            <Type className="w-4 h-4" /> Rozmiar
                                            czcionki
                                        </span>
                                        <span className="font-bold text-white">
                                            {fontSize}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="40"
                                        max="200"
                                        step="5"
                                        value={fontSize}
                                        onChange={(e) =>
                                            setFontSize(
                                                parseInt(e.target.value)
                                            )
                                        }
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 3. Action Button */}
                        <section className="flex flex-col gap-4">
                            <button
                                onClick={handleGenerateVideo}
                                disabled={
                                    status === AppStatus.GENERATING ||
                                    images.length === 0
                                }
                                className="w-full py-4 bg-white hover:bg-white/90 disabled:bg-surface-light disabled:text-white/40 disabled:cursor-not-allowed text-black rounded-full font-bold text-lg shadow transition-all flex items-center justify-center gap-3"
                            >
                                {status === AppStatus.GENERATING ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Play className="fill-current" />
                                )}
                                {status === AppStatus.GENERATING
                                    ? "Renderowanie..."
                                    : "Generuj wideo"}
                            </button>
                        </section>

                        {/* 4. Video Preview */}
                        {currentVideoUrl && (
                            <section className="pt-6 border-t border-gray-800">
                                <h3 className="text-center font-bold text-white/50 text-sm uppercase tracking-wider mb-6">
                                    Podgląd
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
            </main>
        </div>
    );
}
