import sharp from 'sharp';

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Compress an image buffer to stay under maxBytes while maintaining the highest possible quality.
 * - JPEG/WebP: binary-search quality from 95 down to 60
 * - PNG: optimize, then convert to JPEG if still too large
 * - GIF: returned as-is (preserve animation)
 * - Always strips EXIF metadata
 */
export async function compressImage(
  buffer: Buffer,
  contentType: string,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<{ buffer: Buffer; contentType: string }> {
  // GIF: skip compression to preserve animation
  if (contentType === 'image/gif') {
    return { buffer, contentType };
  }

  // First pass: strip metadata with auto-rotate (no quality loss)
  const stripped = await sharp(buffer).rotate().toBuffer();
  if (stripped.length <= maxBytes) {
    return { buffer: stripped, contentType };
  }

  // Determine format
  const isWebp = contentType === 'image/webp';
  const isPng = contentType === 'image/png';

  if (isPng) {
    // Try PNG optimization first
    const optimized = await sharp(buffer).rotate().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    if (optimized.length <= maxBytes) {
      return { buffer: optimized, contentType: 'image/png' };
    }
    // PNG still too large → convert to JPEG
    return binarySearchQuality(buffer, 'jpeg', maxBytes);
  }

  // JPEG or WebP: binary search quality
  return binarySearchQuality(buffer, isWebp ? 'webp' : 'jpeg', maxBytes);
}

async function binarySearchQuality(
  buffer: Buffer,
  format: 'jpeg' | 'webp',
  maxBytes: number,
): Promise<{ buffer: Buffer; contentType: string }> {
  let lo = 60;
  let hi = 95;
  let bestBuffer: Buffer | null = null;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const result = await sharp(buffer)
      .rotate()
      [format]({ quality: mid })
      .toBuffer();

    if (result.length <= maxBytes) {
      bestBuffer = result;
      lo = mid + 1; // Try higher quality
    } else {
      hi = mid - 1; // Try lower quality
    }
  }

  // If even quality 60 is too large, just return quality 60 result
  if (!bestBuffer) {
    bestBuffer = await sharp(buffer)
      .rotate()
      [format]({ quality: 60 })
      .toBuffer();
  }

  return {
    buffer: bestBuffer,
    contentType: format === 'webp' ? 'image/webp' : 'image/jpeg',
  };
}

/**
 * Compress an avatar image: resize to max 400×400 and JPEG quality 85.
 */
export async function compressAvatar(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string }> {
  const result = await sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: 'cover', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  return { buffer: result, contentType: 'image/jpeg' };
}

/**
 * Generate a thumbnail: max 800px wide, JPEG quality 75.
 */
export async function generateThumbnail(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string }> {
  const result = await sharp(buffer)
    .rotate()
    .resize(800, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();

  return { buffer: result, contentType: 'image/jpeg' };
}
