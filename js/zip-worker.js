/* =========================================================
   PDFtoPic — ZIP worker
   Bundles generated images without blocking the interface.
   ========================================================= */

/* global JSZip */

importScripts('../vendor/jszip.min.js');

self.onmessage = async (event) => {
  const message = event.data || {};

  if (message.type !== 'zip') return;

  try {
    const zip = new JSZip();
    const files = Array.isArray(message.files) ? message.files : [];

    files.forEach((file) => {
      if (file && file.name && file.blob) {
        zip.file(file.name, file.blob);
      }
    });

    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'STORE',
        streamFiles: true
      },
      (metadata) => {
        self.postMessage({
          type: 'progress',
          percent: Math.max(0, Math.min(100, metadata.percent || 0))
        });
      }
    );

    self.postMessage({
      type: 'done',
      blob,
      filename: message.zipName || 'gambar.zip'
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: 'Gagal membuat file ZIP. Coba konversi lebih sedikit halaman.'
    });
  }
};
