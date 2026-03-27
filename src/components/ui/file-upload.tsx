"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, FileText, Image as ImageIcon, Video, Loader2, ZoomIn } from "lucide-react";

interface FileUploadProps {
  onUpload: (url: string, fileName?: string, fileType?: string) => void;
  accept?: string;
  label?: string;
  currentUrl?: string;
  className?: string;
  variant?: "default" | "avatar";
}

export default function FileUpload({
  onUpload,
  accept = "image/*,.pdf,video/*",
  label = "Upload File",
  currentUrl,
  className = "",
  variant = "default",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [error, setError] = useState("");
  const [showFullPreview, setShowFullPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect file type from URL
  useEffect(() => {
    if (currentUrl) {
      setPreview(currentUrl);
      const ext = currentUrl.split(".").pop()?.toLowerCase() || "";
      if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) {
        setFileType("image");
      } else if (ext === "pdf") {
        setFileType("document");
      } else if (["mp4", "webm", "mov"].includes(ext)) {
        setFileType("video");
      }
    }
  }, [currentUrl]);

  const isImage = fileType === "image" || (preview && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(preview));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setPreview(data.url);
      setFileName(data.fileName);
      setFileType(data.fileType);
      onUpload(data.url, data.fileName, data.fileType);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setPreview(null);
    setFileName("");
    setFileType("");
    setError("");
    onUpload("", "", "");
    if (inputRef.current) inputRef.current.value = "";
  };

  // Avatar variant - circular photo upload
  if (variant === "avatar") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

        <div className="relative group">
          {preview && isImage ? (
            <img
              src={preview}
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-[#1E2D42] shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-[#1E2D42] shadow-lg">
              <ImageIcon size={32} />
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-dark transition-colors"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          </button>
        </div>

        {preview && (
          <button type="button" onClick={clearFile} className="text-xs text-red-500 hover:underline">
            Remove Photo
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // Default variant - box upload
  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFileSelect} className="hidden" />

      {preview ? (
        <div className="border border-border dark:border-[#1E2D42] rounded-xl overflow-hidden bg-white dark:bg-[#111C2E]">
          {/* Image preview - large */}
          {isImage && (
            <div className="relative bg-gray-50 dark:bg-[#0B1222]">
              <img
                src={preview}
                alt={fileName || "Preview"}
                className="w-full max-h-[200px] object-contain"
              />
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}

          {/* File info bar */}
          <div className="flex items-center gap-3 p-3">
            {!isImage && (
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#0B1222] flex items-center justify-center flex-shrink-0">
                {fileType === "document" ? (
                  <FileText size={20} className="text-red-500" />
                ) : fileType === "video" ? (
                  <Video size={20} className="text-purple-500" />
                ) : (
                  <FileText size={20} className="text-gray-400" />
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {fileName || "Uploaded file"}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                {fileType || "file"} uploaded
              </p>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors flex-shrink-0"
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-300 dark:border-[#1E2D42] rounded-xl p-8 text-center hover:border-primary dark:hover:border-primary transition-all cursor-pointer bg-gray-50 dark:bg-[#111C2E] hover:bg-white dark:hover:bg-[#0F1A2E]"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-primary animate-spin" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload size={24} className="text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 block">{label}</span>
                <span className="text-xs text-gray-400 dark:text-slate-500 mt-1 block">
                  JPG, PNG, PDF, MP4 - Max 10MB
                </span>
              </div>
            </div>
          )}
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* Full screen preview modal */}
      {showFullPreview && preview && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowFullPreview(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setShowFullPreview(false)}
          >
            <X size={24} />
          </button>
          <img
            src={preview}
            alt="Full preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
