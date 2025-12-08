"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Image as ImageIcon,
    Music,
    Type,
    Plus,
    X,
    Trash2,
    Play,
    Pause,
    Smile,
} from "lucide-react";
import {
    db,
    id,
    ImageAsset,
    MusicAsset,
    TextAsset,
    EmojiAsset,
} from "../lib/instantdb";

type ActiveTab = "images" | "music" | "texts" | "emojis";

export default function MediaLibrary() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("images");
    const [newText, setNewText] = useState("");
    const emojiInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const musicInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dragCounter = useRef<number>(0);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Query all assets
    const { data, isLoading } = db.useQuery({
        images: {},
        music: {},
        texts: {},
        emojis: {},
    });

    const images = data?.images || [];
    const musicList = data?.music || [];
    const texts = data?.texts || [];
    const emojis = data?.emojis || [];

    // File to base64 conversion
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    };

    // Add images from files
    const addImagesFromFiles = async (files: File[]) => {
        for (const file of files) {
            if (!file.type.startsWith("image/")) continue;
            const base64 = await fileToBase64(file);
            db.transact(
                db.tx.images[id()].update({
                    name: file.name,
                    url: base64,
                    createdAt: Date.now(),
                })
            );
        }
    };

    // Paste handler for images (when images tab is active)
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (activeTab !== "images") return;
            if (!e.clipboardData) return;

            const items = e.clipboardData.items;
            const imageFiles: File[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === "file" && item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                        imageFiles.push(file);
                    }
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault();
                await addImagesFromFiles(imageFiles);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => {
            window.removeEventListener("paste", handlePaste);
        };
    }, [activeTab]);

    // Add image from file input
    const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        await addImagesFromFiles(Array.from(files));
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    // Drag & Drop handlers for images
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

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const imageFiles = Array.from(files).filter((file: File) =>
                file.type.startsWith("image/")
            );
            if (imageFiles.length > 0) {
                await addImagesFromFiles(imageFiles);
            }
        }
    };

    // Add music
    const handleAddMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith("audio/")) continue;
            const base64 = await fileToBase64(file);
            db.transact(
                db.tx.music[id()].update({
                    name: file.name,
                    url: base64,
                    createdAt: Date.now(),
                })
            );
        }
        if (musicInputRef.current) musicInputRef.current.value = "";
    };

    // Play/Pause music
    const togglePlayMusic = (music: MusicAsset) => {
        if (playingMusicId === music.id) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setPlayingMusicId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(music.url);
            audio.onended = () => {
                setPlayingMusicId(null);
                audioRef.current = null;
            };
            audio.play();
            audioRef.current = audio;
            setPlayingMusicId(music.id);
        }
    };

    // Stop all music when switching tabs or unmounting
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (activeTab !== "music" && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPlayingMusicId(null);
        }
    }, [activeTab]);

    // Add single text
    const handleAddText = () => {
        if (!newText.trim()) return;

        const lines = newText.split("\n").filter((line) => line.trim());

        for (const line of lines) {
            db.transact(
                db.tx.texts[id()].update({
                    content: line.trim(),
                    createdAt: Date.now(),
                })
            );
        }
        setNewText("");
    };

    // Add emoji images
    const handleAddEmoji = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith("image/")) continue;
            const base64 = await fileToBase64(file);
            db.transact(
                db.tx.emojis[id()].update({
                    name: file.name,
                    url: base64,
                    createdAt: Date.now(),
                })
            );
        }
        if (emojiInputRef.current) emojiInputRef.current.value = "";
    };

    // Paste handler for texts
    const handleTextPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        // Let the default paste happen
    };

    // Delete handlers
    const deleteImage = (imageId: string) => {
        db.transact(db.tx.images[imageId].delete());
    };

    const deleteMusic = (musicId: string) => {
        db.transact(db.tx.music[musicId].delete());
    };

    const deleteText = (textId: string) => {
        db.transact(db.tx.texts[textId].delete());
    };

    const deleteEmoji = (emojiId: string) => {
        db.transact(db.tx.emojis[emojiId].delete());
    };

    const tabs = [
        {
            id: "images" as const,
            icon: ImageIcon,
            label: "Zdjęcia",
            count: images.length,
        },
        {
            id: "music" as const,
            icon: Music,
            label: "Muzyka",
            count: musicList.length,
        },
        {
            id: "texts" as const,
            icon: Type,
            label: "Teksty",
            count: texts.length,
        },
        {
            id: "emojis" as const,
            icon: Smile,
            label: "Emoji",
            count: emojis.length,
        },
    ];

    return (
        <div className="h-full flex flex-col bg-black border-r border-gray-800">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white">
                    Biblioteka Zasobów
                </h2>
                <p className="text-xs text-white/50 mt-1">
                    Zarządzaj zasobami do TikToków
                </p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-4 border-b border-gray-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-1 text-[10px] font-medium transition-colors flex flex-col items-center gap-0.5 ${
                            activeTab === tab.id
                                ? "text-white bg-surface border-b-2 border-white"
                                : "text-white/50 hover:text-white/70 hover:bg-surface-light"
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        <span className="text-[9px] text-white/40">
                            ({tab.count})
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {isLoading ? (
                    <div className="text-white/50 text-sm text-center py-8">
                        Ładowanie...
                    </div>
                ) : (
                    <>
                        {/* Images Tab */}
                        {activeTab === "images" && (
                            <div className="space-y-3">
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleAddImage}
                                />
                                <div
                                    ref={dropZoneRef}
                                    onClick={() =>
                                        imageInputRef.current?.click()
                                    }
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    className={`w-full py-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                                        isDragging
                                            ? "border-white bg-surface-light scale-[1.02]"
                                            : "border-gray-700 hover:border-white/50 text-white/60 hover:text-white"
                                    }`}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <Plus className="w-5 h-5" />
                                        <span className="text-sm font-medium">
                                            {isDragging
                                                ? "Upuść tutaj!"
                                                : "Dodaj zdjęcia"}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            lub wklej (Ctrl+V)
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {images
                                        .sort(
                                            (a: ImageAsset, b: ImageAsset) =>
                                                b.createdAt - a.createdAt
                                        )
                                        .map((image: ImageAsset) => (
                                            <div
                                                key={image.id}
                                                className="relative group aspect-square rounded-lg overflow-hidden border border-gray-800"
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={() =>
                                                        deleteImage(image.id)
                                                    }
                                                    className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                </div>

                                {images.length === 0 && (
                                    <p className="text-white/40 text-xs text-center py-4">
                                        Brak zdjęć w bibliotece
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Music Tab */}
                        {activeTab === "music" && (
                            <div className="space-y-3">
                                <input
                                    ref={musicInputRef}
                                    type="file"
                                    accept="audio/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleAddMusic}
                                />
                                <button
                                    onClick={() =>
                                        musicInputRef.current?.click()
                                    }
                                    className="w-full py-3 border-2 border-dashed border-gray-700 rounded-xl text-white/60 hover:text-white hover:border-white/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Dodaj muzykę
                                </button>

                                <div className="space-y-2">
                                    {musicList
                                        .sort(
                                            (a: MusicAsset, b: MusicAsset) =>
                                                b.createdAt - a.createdAt
                                        )
                                        .map((music: MusicAsset) => {
                                            const isPlaying =
                                                playingMusicId === music.id;
                                            return (
                                                <div
                                                    key={music.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors group ${
                                                        isPlaying
                                                            ? "bg-purple-600/20 border-purple-500/50"
                                                            : "bg-surface border-gray-800"
                                                    }`}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            togglePlayMusic(
                                                                music
                                                            )
                                                        }
                                                        className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                                                            isPlaying
                                                                ? "bg-purple-600 text-white"
                                                                : "bg-surface-light text-white/60 hover:bg-white/20 hover:text-white"
                                                        }`}
                                                    >
                                                        {isPlaying ? (
                                                            <Pause className="w-3 h-3" />
                                                        ) : (
                                                            <Play className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                    <span
                                                        className={`text-sm truncate flex-1 ${
                                                            isPlaying
                                                                ? "text-white"
                                                                : "text-white/80"
                                                        }`}
                                                    >
                                                        {music.name}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            if (isPlaying) {
                                                                audioRef.current?.pause();
                                                                audioRef.current =
                                                                    null;
                                                                setPlayingMusicId(
                                                                    null
                                                                );
                                                            }
                                                            deleteMusic(
                                                                music.id
                                                            );
                                                        }}
                                                        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>

                                {musicList.length === 0 && (
                                    <p className="text-white/40 text-xs text-center py-4">
                                        Brak muzyki w bibliotece
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Texts Tab */}
                        {activeTab === "texts" && (
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <textarea
                                        value={newText}
                                        onChange={(e) =>
                                            setNewText(e.target.value)
                                        }
                                        onPaste={handleTextPaste}
                                        placeholder="Wpisz tekst lub wklej wiele linii..."
                                        rows={3}
                                        className="w-full p-3 bg-surface-light border border-gray-800 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:border-white/30 resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddText}
                                            disabled={!newText.trim()}
                                            className="flex-1 py-2 bg-white text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Dodaj{" "}
                                            {newText.includes("\n")
                                                ? "teksty"
                                                : "tekst"}
                                        </button>
                                    </div>
                                    <p className="text-xs text-white/40 text-center">
                                        Wklej wiele linii - każda stanie się
                                        osobnym tekstem
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {texts
                                        .sort(
                                            (a: TextAsset, b: TextAsset) =>
                                                b.createdAt - a.createdAt
                                        )
                                        .map((text: TextAsset) => (
                                            <div
                                                key={text.id}
                                                className="flex items-start gap-2 p-3 bg-surface rounded-lg border border-gray-800 group"
                                            >
                                                <Type className="w-4 h-4 text-white/50 flex-shrink-0 mt-0.5" />
                                                <span className="text-sm text-white/80 flex-1 break-words">
                                                    {text.content}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        deleteText(text.id)
                                                    }
                                                    className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 flex-shrink-0"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                </div>

                                {texts.length === 0 && (
                                    <p className="text-white/40 text-xs text-center py-4">
                                        Brak tekstów w bibliotece
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Emojis Tab */}
                        {activeTab === "emojis" && (
                            <div className="space-y-3">
                                <input
                                    ref={emojiInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleAddEmoji}
                                />
                                <button
                                    onClick={() =>
                                        emojiInputRef.current?.click()
                                    }
                                    className="w-full py-4 border-2 border-dashed border-gray-700 rounded-xl text-white/60 hover:text-white hover:border-white/50 transition-colors flex flex-col items-center gap-1"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="text-sm font-medium">
                                        Dodaj grafiki emoji
                                    </span>
                                    <span className="text-xs text-white/40">
                                        PNG, JPG, GIF...
                                    </span>
                                </button>

                                <div className="grid grid-cols-3 gap-2">
                                    {emojis
                                        .sort(
                                            (a: EmojiAsset, b: EmojiAsset) =>
                                                b.createdAt - a.createdAt
                                        )
                                        .map((emoji: EmojiAsset) => (
                                            <div
                                                key={emoji.id}
                                                className="relative group aspect-square rounded-lg bg-surface border border-gray-800 overflow-hidden"
                                            >
                                                <img
                                                    src={emoji.url}
                                                    alt={emoji.name}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                                <button
                                                    onClick={() =>
                                                        deleteEmoji(emoji.id)
                                                    }
                                                    className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                >
                                                    <X className="w-2.5 h-2.5 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                </div>

                                {emojis.length === 0 && (
                                    <p className="text-white/40 text-xs text-center py-4">
                                        Brak grafik emoji w bibliotece
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
