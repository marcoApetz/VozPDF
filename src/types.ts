export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'contrast';
export type ReaderFontFamily = 'sans' | 'serif' | 'dyslexic';
export type HighlightColor = 'yellow' | 'blue' | 'emerald' | 'amber' | 'purple';
export type ViewMode = 'clean' | 'anomalies' | 'split_pdf';

export type AnomalyType = 
  | 'repeating_char' 
  | 'dot_leader' 
  | 'hyphen_break' 
  | 'duplicate_punct' 
  | 'header_footer' 
  | 'ocr_artifact';

export interface AnomalyDetail {
  id: string;
  type: AnomalyType;
  original: string;
  replacement: string;
  count: number;
  description: string;
  indexInSentence?: number;
}

export interface SentenceData {
  id: string;
  rawText: string;
  cleanedText: string;
  sentenceIndex: number;
  paragraphIndex?: number;
  pageIndex: number;
  anomalies: AnomalyDetail[];
}

export interface PageData {
  pageNumber: number;
  originalText: string;
  cleanedText: string;
  sentences: SentenceData[];
  anomalyCount: number;
  detectedAnomalies: AnomalyDetail[];
}

export type FileFormat = 'pdf' | 'docx' | 'txt' | 'gdoc';

export interface DocumentItem {
  id: string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  fileType?: FileFormat;
  source?: 'local' | 'gdrive' | 'custom_text';
  driveFileId?: string;
  totalPages: number;
  pages: PageData[];
  createdAt: number;
  lastReadAt: number;
  readingProgress: {
    pageIndex: number;
    sentenceIndex: number;
    completedPercentage: number;
  };
  estimatedReadingMinutes: number;
  totalWords: number;
  totalAnomaliesCleaned: number;
  pdfDataUrl?: string; // Cache for side-by-side view
}

export interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  documentIds: string[]; // Ordered list of document IDs for sequential playback
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export interface GDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  parents?: string[];
}

export interface CleaningSettings {
  maxConsecutiveChars: number; // e.g. 2 (e.g. "aaaaaa" -> "aa")
  cleanDotLeaders: boolean; // "........" or "--------" in TOC/forms
  cleanDuplicatePunctuation: boolean; // "!!!!" -> "!"
  fixHyphenatedLineBreaks: boolean; // "de- \n senvolvimento" -> "desenvolvimento"
  removePageNumberArtifacts: boolean; // "Pág. 12" isolated headers
  removeRepeatingFormUnderscores: boolean; // "__________"
  highlightCleanedInReader: boolean;
}

export interface ReaderPreferences {
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  fontSize: number; // 14 to 30
  lineHeight: number; // 1.4 to 2.2
  textAlign: 'left' | 'justify';
  voiceURI: string;
  speechRate: number; // 0.5 to 2.5
  speechPitch: number; // 0.5 to 1.5
  speechVolume: number; // 0 to 1
  highlightColor: HighlightColor;
  autoScroll: boolean;
  viewMode: ViewMode;
  continuousPageRead: boolean; // automatically advance to next page when TTS finishes
  repeatParagraphTwice: boolean; // Repetir cada parágrafo 2 vezes (Modo Estudo)
  repeatParagraphCount: number; // 2
}

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  gender: 'female' | 'male' | 'unknown';
  isPortuguese: boolean;
  isDefault: boolean;
}
