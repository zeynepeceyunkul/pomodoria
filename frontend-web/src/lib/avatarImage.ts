const MAX_EDGE = 256;
const JPEG_QUALITY = 0.82;
const MAX_DATA_URI_LENGTH = 280_000;

export async function readAvatarDataUri(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image must be smaller than 8 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUri = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (dataUri.length > MAX_DATA_URI_LENGTH) {
    throw new Error('Image is still too large after compression. Try a smaller photo.');
  }
  return dataUri;
}
