"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Image, Video, Loader2 } from "lucide-react";

interface FileUploadProps {
  onUpload: (url: string, fileName: string, fileType: string) => void;
  accept?: string;
  label?: string;
  currentUrl?: string;
  className?: string;
}

export default function FileUpload({
  onUpload,
  accept = "image/*,.pdf,video/*",
  label = "Upload File",
  currentUrl,
  className = "",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size client-side
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
    onUpload("", "", "");
    if (inputRef.current) inputRef.current.value = "";
  };

  const getFileIcon = () => {
    if (fileType === "image") return <Image size={20} className="text-blue-500" />;
    if (fileType === "document") return <FileText size={20} className="text-red-500" />;
    if (fileType === "video") return <Video size={20} className="text-purple-500" />;
    return <FileText size={20} className="text-gray-500" />;
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview */}
      {preview ? (
        <div className="border border-border dark:border-[#1E2D42] rounded-lg p-3 bg-white dark:bg-[#111C2E]">
          <div className="flex items-center gap-3">
            {/* Thumbnail or icon */}
            {fileType === "image" ? (
              <img
                src={preview}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover border border-border dark:border-[#1E2D42]"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-[#0B1222] flex items-center justify-center">
                {getFileIcon()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {fileName || "Uploaded file"}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{fileType || "file"}</p>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Upload button */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border dark:border-[#1E2D42] rounded-lg p-6 text-center hover:border-primary dark:hover:border-primary transition-colors cursor-pointer bg-white dark:bg-[#111C2E]"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-primary animate-spin" />
              <span className="text-sm text-gray-500 dark:text-slate-400">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-slate-300">{label}</span>
              <span className="text-xs text-gray-400 dark:text-slate-500">
                JPG, PNG, PDF, MP4 - Max 10MB
              </span>
            </div>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}
    </div>
  );
}
