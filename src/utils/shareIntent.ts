import { Capacitor, registerPlugin } from '@capacitor/core';

export interface SharedFilePayload {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

interface ShareIntentPlugin {
  addListener(
    eventName: 'shareReceived',
    listenerFunc: (data: SharedFilePayload) => void
  ): Promise<{ remove: () => void }>;
}

// Custom native-only plugin (android/app/src/main/java/.../ShareIntentPlugin.java).
// It has no web implementation: only call it behind Capacitor.isNativePlatform().
const ShareIntent = registerPlugin<ShareIntentPlugin>('ShareIntent');

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

// Some apps share a display name with no (or the wrong) extension; App.tsx's
// upload handler picks its parser from the file extension, so make sure it matches
// the mimeType Android gave us for the intent.
function withReliableExtension(fileName: string, mimeType: string): string {
  const expected = EXTENSION_BY_MIME[mimeType];
  if (!expected || fileName.toLowerCase().endsWith(expected)) return fileName;
  return `${fileName}${expected}`;
}

function base64ToFile({ fileName, mimeType, base64Data }: SharedFilePayload): File {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], withReliableExtension(fileName, mimeType), { type: mimeType });
}

/**
 * Listens for files shared into VozPDF from Android's system Share sheet
 * (e.g. opening a PDF in another app and choosing "Share > VozPDF"), turning
 * each one into a regular File for the existing upload pipeline. No-op on web.
 * Returns a cleanup function.
 */
export function initShareIntentListener(onFileShared: (file: File) => void): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let cancelled = false;
  let handle: { remove: () => void } | null = null;

  ShareIntent.addListener('shareReceived', (payload) => {
    onFileShared(base64ToFile(payload));
  }).then((h) => {
    if (cancelled) {
      h.remove();
    } else {
      handle = h;
    }
  });

  return () => {
    cancelled = true;
    handle?.remove();
  };
}
