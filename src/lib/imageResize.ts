const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.75;
// Restaurant docs also get copied into a history snapshot on every edit (see
// recordHistorySnapshot in db.ts), so keeping each photo well under Firestore's 1MB
// document limit matters even though this cap alone wouldn't be reached.
const MAX_DATA_URL_LENGTH = 900_000;

/** Downscales/compresses an image file client-side and returns it as a JPEG data URI. */
export function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('画像として読み込めませんでした'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('この端末では画像処理に対応していません'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
          reject(new Error('画像が大きすぎます。別の画像をお試しください'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
