import { type CSSProperties, useCallback, useState, type ReactNode } from 'react';
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
  const [preview, setPreview] = useState<string | null>(null);

  const { pickFile, upload, isUploading, progress, error } = useMediaUpload({
    ...uploadOpts,
    onSuccess: (url, asset) => {
      setPreview(null);
      onChange?.(url);
      uploadOpts.onSuccess?.(url, asset);
    },
    onError: (err) => {
      setPreview(null);
      uploadOpts.onError?.(err);
    },
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || isUploading) return;
      const file = e.dataTransfer.files[0];
      if (file) {
        setPreview(URL.createObjectURL(file));
        upload(file);
      }
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
      if (file) {
        setPreview(URL.createObjectURL(file));
        upload(file);
      }
    };
    input.click();
  }, [disabled, isUploading, upload, uploadOpts.accept]);

  const displayUrl = preview ?? value;
  const borderRadius = shape === 'circle' ? '50%' : 6;

  return (
    <div
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
        ...style,
      }}
      title={disabled ? undefined : '点击或拖拽上传图片'}
    >
      {/* Current / preview image */}
      {displayUrl && (
        <img
          src={displayUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
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
              <div>点击上传</div>
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
