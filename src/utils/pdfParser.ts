import * as pdfjsLib from 'pdfjs-dist';
import { PageData, DocumentItem, CleaningSettings } from '../types';
import { splitIntoSentences, countWords, estimateReadingMinutes, DEFAULT_CLEANING_SETTINGS } from './textSanitizer';

// Configure worker URL
if (typeof window !== 'undefined') {
  try {
    // Try using unpkg / cdnjs worker corresponding to pdfjs version, or embedded worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF Worker initialization note:', e);
  }
}

/**
 * Format bytes into readable format
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parse an uploaded PDF File or ArrayBuffer and extract structured text & sentences
 */
export async function parsePdfFile(
  fileOrBuffer: File | ArrayBuffer,
  fileName: string = 'documento.pdf',
  cleaningSettings: CleaningSettings = DEFAULT_CLEANING_SETTINGS,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentItem> {
  let arrayBuffer: ArrayBuffer;
  let fileSizeBytes = 0;

  if (fileOrBuffer instanceof File) {
    fileSizeBytes = fileOrBuffer.size;
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    fileSizeBytes = fileOrBuffer.byteLength;
    arrayBuffer = fileOrBuffer;
  }

  onProgress?.(10, 'Carregando estrutura do PDF...');

  // Load PDF with pdfjs
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pages: PageData[] = [];
  let totalWordCount = 0;
  let totalAnomaliesCount = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const percent = 10 + Math.floor((pageNum / totalPages) * 75);
    onProgress?.(percent, `Extraindo texto da página ${pageNum} de ${totalPages}...`);

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Extract text items and maintain layout spacing
    let lastY: number | null = null;
    let pageRawText = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] };
        const currentY = textItem.transform[5];

        if (lastY !== null && Math.abs(currentY - lastY) > 8) {
          // Line break
          pageRawText += '\n';
        } else if (pageRawText.length > 0 && !pageRawText.endsWith(' ') && !pageRawText.endsWith('\n')) {
          pageRawText += ' ';
        }

        pageRawText += textItem.str;
        lastY = currentY;
      }
    }

    // Sanitize and split into sentences
    const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
      pageRawText,
      pageNum - 1,
      cleaningSettings
    );

    const pageWords = countWords(pageCleanedText);
    totalWordCount += pageWords;
    totalAnomaliesCount += pageAnomalies.length;

    pages.push({
      pageNumber: pageNum,
      originalText: pageRawText,
      cleanedText: pageCleanedText,
      sentences,
      anomalyCount: pageAnomalies.length,
      detectedAnomalies: pageAnomalies,
    });
  }

  onProgress?.(95, 'Finalizando índice e estimativas...');

  const cleanDocTitle = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]/g, ' ')
    .trim();

  const docItem: DocumentItem = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    title: cleanDocTitle || 'Documento sem título',
    fileName,
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    totalPages,
    pages,
    createdAt: Date.now(),
    lastReadAt: Date.now(),
    readingProgress: {
      pageIndex: 0,
      sentenceIndex: 0,
      completedPercentage: 0,
    },
    estimatedReadingMinutes: estimateReadingMinutes(totalWordCount),
    totalWords: totalWordCount,
    totalAnomaliesCleaned: totalAnomaliesCount,
  };

  onProgress?.(100, 'Pronto!');
  return docItem;
}

/**
 * Render a specific PDF page to an HTML Canvas
 */
export async function renderPdfPageToCanvas(
  arrayBuffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<void> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const context = canvas.getContext('2d');
  if (!context) return;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  await (page.render(renderContext as any) as any).promise;
}
