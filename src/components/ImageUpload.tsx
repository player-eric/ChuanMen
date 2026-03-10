import { type CSSProperties, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMediaUpload, type UseMediaUploadOptions } from '@/hooks/useMediaUpload';
import { useColors } from '@/hooks/useColors';

/* ═══════════════════════════════════════════════════════════════
   ImageUpload — drop‐zone / click‐to‐upload component
   ═══════════════════════════════════════════════════════════════ */

export interface ImageUploadProps extends UseMediaUploadOptions {
  /** Current image URL (renders as preview) */
  value?: string | null;
  /** Called with the new public URL after upload completes */
  onChange?: (url: string) => void;
  /** Width / height of the upload area */
  width?: number | string;
  height?: number | string;
  /** Shape: 'rect' | 'circle' */
  shape?: 'rect' | 'circle';
  /** Placeholder shown when no image is set */
  placeholder?: ReactNode;
  /** Extra style */
  style?: CSSProperties;
  /** Disable interaction */
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  width = 120,
  height = 120,
  shape = 'rect',
  placeholder,
  style,
  disabled = false,
  ...uploadOpts
}: ImageUploadProps) {
  const c = useColors();
  // Local blob URL — kept alive until remote URL loads successfully
  const [preview, setPreview] = useState<string | null>(null);
  // Tracks if the remote `value` URL failed to load
  const [remoteFailed, setRemoteFailed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const { pickFile, upload, isUploading, progress, error } = useMediaUpload({
    ...uploadOpts,
    onSuccess: (url, asset) => {
      // Don't clear preview yet — let onLoad do it once remote URL is verified
      onChange?.(url);
      uploadOpts.onSuccess?.(url, asset);
    },
    onError: (err) => {
      // Upload itself failed — keep blob preview so user still sees their image
      uploadOpts.onError?.(err);
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      if (disabled || isUploading) return;
      setRemoteFailed(false);
      setPreview(URL.createObjectURL(file));
      upload(file);
    },
    [disabled, isUploading, upload],
  );

  // Paste support — listen on document so Ctrl+V works anywhere on the page
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e: ClipboardEvent) => {
      // Don't intercept paste in text inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/'),
      );
      if (file) {
        e.preventDefault();
        handleFile(file);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleFile, disabled]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, isUploading, upload],
  );

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    // Use a hidden input so we can show a local preview immediately
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = (uploadOpts.accept ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']).join(',');
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [disabled, isUploading, upload, uploadOpts.accept]);

  // Priority: blob preview > remote value (if it loaded OK) > nothing
  const displayUrl = preview ?? (remoteFailed ? null : value) ?? null;
  const borderRadius = shape === 'circle' ? '50%' : 6;

  return (
    <div
      ref={containerRef}
      tabIndex={disabled ? undefined : 0}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{
        position: 'relative',
        width,
        height,
        borderRadius,
        border: `2px dashed ${c.text3}40`,
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: c.s2,
        flexShrink: 0,
        outline: 'none',
        ...style,
      }}
      title={disabled ? undefined : '点击、拖拽或粘贴上传图片'}
    >
      {/* Current / preview image */}
      {displayUrl && (
        <img
          src={displayUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onLoad={() => {
            // Remote URL loaded OK — safe to release blob preview
            if (preview && value && displayUrl === value) setPreview(null);
          }}
          onError={() => {
            // If we're showing the remote URL and it failed, mark it
            if (!preview && value) setRemoteFailed(true);
          }}
        />
      )}

      {/* Overlay during upload */}
      {isUploading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
          }}
        >
          <div style={{ marginBottom: 4 }}>上传中…</div>
          <div
            style={{
              width: '60%',
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.3)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(progress * 100)}%`,
                height: '100%',
                background: '#fff',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {/* Placeholder */}
      {!displayUrl && !isUploading && (
        <div style={{ color: c.text3, fontSize: 12, textAlign: 'center', padding: 8 }}>
          {placeholder ?? (
            <>
              <div style={{ fontSize: 24, marginBottom: 2 }}>📷</div>
              <div>点击 / 粘贴上传</div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(200,0,0,0.85)',
            color: '#fff',
            fontSize: 10,
            padding: '2px 4px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
