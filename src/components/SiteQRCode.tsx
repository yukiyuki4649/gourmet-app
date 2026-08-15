import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function SiteQRCode() {
  const [dataUrl, setDataUrl] = useState('');
  const url = window.location.origin;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 160, margin: 1 })
      .then(setDataUrl)
      .catch(err => console.error('Failed to generate QR code:', err));
  }, [url]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <img src={dataUrl} alt="このページのQRコード" width={160} height={160} />
      <p className="text-xs text-gray-500">このページのQRコードです</p>
    </div>
  );
}
