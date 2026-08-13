import { useEffect, useRef, useState } from 'react';
import { PhotoInfo } from '../types/restaurant';
import { resizeImageToDataUrl } from '../lib/imageResize';

interface PhotoFieldProps {
  label: string;
  photo: PhotoInfo | null;
  onChange: (photo: PhotoInfo | null) => void;
}

export function PhotoField({ label, photo, onChange }: PhotoFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [imgFailed, setImgFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the broken-image state whenever a different photo is set, so a fresh URL
  // gets a fresh chance to load instead of staying stuck on the old failure.
  useEffect(() => {
    setImgFailed(false);
  }, [photo?.url]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow selecting the same file again later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onChange({ url: dataUrl, creditName: '', creditUrl: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の読み込みに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange({ url: trimmed, creditName: '', creditUrl: '' });
    setUrlInput('');
    setShowUrlInput(false);
    setError('');
  };

  return (
    <div>
      <p className="text-sm font-medium mb-1">{label}</p>
      {photo ? (
        <div className="mb-2">
          {imgFailed ? (
            <div className="w-full h-32 bg-red-50 border border-red-200 rounded-md flex items-center justify-center text-xs text-red-600 text-center p-3">
              画像を読み込めませんでした。リンク切れか、このサイトが直接の埋め込み表示をブロックしている可能性があります。
              画像を右クリック→「画像アドレスをコピー」で取得した直接リンク(.jpg/.pngなどで終わるURL)を試してください。
            </div>
          ) : (
            <img
              src={photo.url}
              alt={label}
              onError={() => setImgFailed(true)}
              className="w-full h-32 object-cover rounded-md"
            />
          )}
          {photo.creditName && (
            <p className="text-xs text-gray-400 mt-1">
              Photo by{' '}
              <a href={photo.creditUrl} target="_blank" rel="noreferrer" className="underline">
                {photo.creditName}
              </a>{' '}
              on Unsplash
            </p>
          )}
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center text-sm text-gray-400 mb-2">
          写真なし
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {uploading ? '読み込み中...' : '端末から選ぶ'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => setShowUrlInput(v => !v)}
          className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
        >
          画像URLを指定
        </button>
        {photo && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            削除
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {showUrlInput && (
        <div className="flex gap-2 mt-2">
          <input
            type="url"
            placeholder="https://..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            disabled={!urlInput.trim()}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            設定
          </button>
        </div>
      )}
    </div>
  );
}
