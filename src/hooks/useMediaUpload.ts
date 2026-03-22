import { useCallback, useRef, useState } from 'react';
import { uploadMedia, type MediaAsset, type MediaCategory } from '@/lib/domainApi';

export interface UseMediaUploadOptions {
  /** S3 folder category (avatar, cover, event-image, poster …) */
  category: MediaCategory;
  /** Owner user ID — used for S3 key namespacing */
  ownerId?: string;
  /** Max file size in bytes (default 10 MB) */
  maxSize?: number;
  /** Allowed MIME types (default: image/*) */
  accept?: string[];
  /** Called after successful upload */
  onSuccess?: (publicUrl: string, asset: MediaAsset) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface UseMediaUploadReturn {
  /** Trigger a file picker (call from a button onClick) */
  pickFile: () => void;
  /** Or pass a File directly */
  upload: (file: File) => Promise<{ publicUrl: string; asset: MediaAsset } | null>;
  /** Upload state */
  isUploading: boolean;
  /** Progress: 0-1 (presign stage = 0.1, uploading = 0.5, confirming = 0.9, done = 1) */
  progress: number;
  /** Error message, if any */
  error: string | null;
  /** The resulting public URL after a successful upload */
  publicUrl: string | null;
  /** Reset state */
  reset: () => void;
}

const DEFAULT_MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function useMediaUpload(options: UseMediaUploadOptions): UseMediaUploadReturn {
  const { category, ownerId, maxSize = DEFAULT_MAX_SIZE, accept = DEFAULT_ACCEPT, onSuccess, onError } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setPublicUrl(null);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<{ publicUrl: string; asset: MediaAsset } | null> => {
      // Validate — allow empty type (some mobile browsers omit it)
      if (file.type && !accept.includes(file.type)) {
        const msg = `不支持的文件类型: ${file.type}`;
        setError(msg);
        onError?.(new Error(msg));
        return null;
      }
      if (file.size > maxSize) {
        const msg = `文件过大 (${(file.size / 1024 / 1024).toFixed(1)} MB)，最大 ${(maxSize / 1024 / 1024).toFixed(0)} MB`;
        setError(msg);
        onError?.(new Error(msg));
        return null;
      }

      setIsUploading(true);
      setError(null);
      setProgress(0.1);

      try {
        setProgress(0.3);
        const result = await uploadMedia(file, category, ownerId);
        setProgress(1);
        setPublicUrl(result.publicUrl);
        onSuccess?.(result.publicUrl, result.asset);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '上传失败';
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [category, ownerId, maxSize, accept, onSuccess, onError],
  );

  const pickFile = useCallback(() => {
    // Create a hidden file input
    if (!inputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      input.accept = accept.join(',');
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (file) {
          upload(file);
        }
        input.value = ''; // reset so same file can be re-selected
      });
      document.body.appendChild(input);
      inputRef.current = input;
    }
    inputRef.current.accept = accept.join(',');
    inputRef.current.click();
  }, [accept, upload]);

  return { pickFile, upload, isUploading, progress, error, publicUrl, reset };
}
