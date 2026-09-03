import mammoth from 'mammoth';
import { PageData, DocumentItem, CleaningSettings } from '../types';
import { splitIntoSentences, countWords, estimateReadingMinutes, DEFAULT_CLEANING_SETTINGS } from './textSanitizer';

/**
 * Format bytes into readable format
 */
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parse an uploaded DOCX File or ArrayBuffer and extract structured text & sentences
 */
export async function parseDocxFile(
  fileOrBuffer: File | ArrayBuffer,
  fileName: string = 'documento.docx',
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

  onProgress?.(20, 'Lendo arquivo Word (.docx)...');

  // Extract raw text with Mammoth
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawFullText = result.value || '';

  onProgress?.(50, 'Dividindo parágrafos e estruturando documento...');

  // Split into pseudo-pages for comfortable reading (e.g. ~400-500 words per page or paragraph groups)
  const paragraphs = rawFullText
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const pages: PageData[] = [];
  const PARAGRAPHS_PER_PAGE = 4;
  let currentGroup: string[] = [];
  let pageNumber = 1;

  for (let i = 0; i < paragraphs.length; i++) {
    currentGroup.push(paragraphs[i]);
    if (currentGroup.length >= PARAGRAPHS_PER_PAGE || i === paragraphs.length - 1) {
      const pageText = currentGroup.join('\n\n');
      const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
        pageText,
        pageNumber - 1,
        cleaningSettings
      );

      pages.push({
        pageNumber,
        originalText: pageText,
        cleanedText: pageCleanedText,
        sentences,
        anomalyCount: pageAnomalies.length,
        detectedAnomalies: pageAnomalies,
      });

      pageNumber++;
      currentGroup = [];
    }
  }

  // Fallback if empty doc
  if (pages.length === 0) {
    const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
      'Documento Word sem texto legível.',
      0,
      cleaningSettings
    );
    pages.push({
      pageNumber: 1,
      originalText: 'Documento Word sem texto legível.',
      cleanedText: pageCleanedText,
      sentences,
      anomalyCount: pageAnomalies.length,
      detectedAnomalies: pageAnomalies,
    });
  }

  let totalWords = 0;
  let totalAnomaliesCleaned = 0;
  pages.forEach(p => {
    totalWords += countWords(p.cleanedText);
    totalAnomaliesCleaned += p.anomalyCount;
  });

  const title = fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  onProgress?.(100, 'Documento Word pronto para leitura!');

  return {
    id: docId,
    title,
    fileName,
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    totalPages: pages.length,
    pages,
    createdAt: Date.now(),
    lastReadAt: Date.now(),
    readingProgress: {
      pageIndex: 0,
      sentenceIndex: 0,
      completedPercentage: 0,
    },
    estimatedReadingMinutes: estimateReadingMinutes(totalWords),
    totalWords,
    totalAnomaliesCleaned,
  };
}
