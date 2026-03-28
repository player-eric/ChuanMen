import imageCompression from 'browser-image-compression';

/**
 * Compress an avatar image in the browser: resize to 400×400, JPEG quality 85.
 * GIFs are returned as-is to preserve animation.
 */
export async function compressImageInBrowser(
  file: File,
  _category: string,
): Promise<File> {
  if (file.type === 'image/gif') return file;

  return imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
  });
}
