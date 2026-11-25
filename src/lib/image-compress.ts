/**
 * Compresses an image File into a lightweight WebP data URL (max width 800px, quality 0.55)
 * for minimal database footprint while keeping Aadhaar text readable.
 */
export async function compressImageToDataUrl(file: File, maxWidth = 800, quality = 0.55): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file (JPG, PNG, or WEBP).");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image is too large (max 15 MB).");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const webp = canvas.toDataURL("image/webp", quality);
        // Fallback to compressed JPEG if browser doesn't support WebP canvas encoding
        if (webp.startsWith("data:image/webp")) {
          resolve(webp);
        } else {
          resolve(canvas.toDataURL("image/jpeg", 0.65));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
