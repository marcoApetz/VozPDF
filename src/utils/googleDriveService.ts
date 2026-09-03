import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GDriveFileItem, DocumentItem, CleaningSettings, PageData } from '../types';
import { parsePdfFile, formatBytes } from './pdfParser';
import { parseDocxFile } from './docxParser';
import { splitIntoSentences, countWords, estimateReadingMinutes, DEFAULT_CLEANING_SETTINGS } from './textSanitizer';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents.readonly'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let cachedAccessToken: string | null = null;
let isSigningIn = false;
let currentUser: User | null = null;

/**
 * Initialize Google Auth listener
 */
export function initGoogleDriveAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
}

/**
 * Check if user is authenticated with a valid cached access token
 */
export function isGoogleAuthenticated(): boolean {
  return !!cachedAccessToken && !!currentUser;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function getStoredGoogleToken(): string | null {
  return cachedAccessToken;
}

/**
 * Sign in with Google Popup and obtain access token
 */
export async function googleSignIn(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Request access token from user via sign-in popup if not available
 */
export async function requestGoogleDriveAccess(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  const result = await googleSignIn();
  return result.accessToken;
}

/**
 * Sign out
 */
export async function googleSignOut(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  currentUser = null;
}

export interface ListDriveResponse {
  files: GDriveFileItem[];
  nextPageToken?: string;
}

/**
 * List readable documents from Google Drive (PDFs, Google Docs, DOCX, TXT, e-books, scans) and Folders.
 * Supports:
 * - Specific folder navigation (folderId) or Whole Drive search
 * - Multiple file types & broad MIME types
 * - Shared Drives and items shared with me (supportsAllDrives & includeItemsFromAllDrives)
 * - Pagination token
 * - Filter by file type ('all' | 'folders' | 'pdf' | 'docs' | 'word' | 'txt')
 */
export async function listGoogleDriveFiles(
  searchQuery: string = '',
  folderId: string = 'root',
  filterType: 'all' | 'folders' | 'pdf' | 'docs' | 'word' | 'txt' = 'all',
  pageToken?: string,
  pageSize: number = 60
): Promise<ListDriveResponse> {
  const token = await requestGoogleDriveAccess();

  // Construct MIME type condition based on filter
  let mimeCondition = '';
  if (filterType === 'folders') {
    mimeCondition = `mimeType = 'application/vnd.google-apps.folder'`;
  } else if (filterType === 'pdf') {
    mimeCondition = `mimeType = 'application/pdf'`;
  } else if (filterType === 'docs') {
    mimeCondition = `mimeType = 'application/vnd.google-apps.document'`;
  } else if (filterType === 'word') {
    mimeCondition = `(mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.oasis.opendocument.text')`;
  } else if (filterType === 'txt') {
    mimeCondition = `(mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'text/csv' or mimeType = 'text/html' or mimeType = 'application/rtf' or mimeType = 'text/rtf')`;
  } else {
    // 'all' supported types: folders + all text-based / document / ebook / presentation formats
    mimeCondition = `(
      mimeType = 'application/vnd.google-apps.folder' or 
      mimeType = 'application/pdf' or 
      mimeType = 'application/vnd.google-apps.document' or 
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or 
      mimeType = 'application/msword' or 
      mimeType = 'application/vnd.oasis.opendocument.text' or 
      mimeType = 'application/rtf' or 
      mimeType = 'text/rtf' or 
      mimeType = 'text/plain' or 
      mimeType = 'text/markdown' or 
      mimeType = 'text/csv' or 
      mimeType = 'application/epub+zip'
    )`;
  }

  // Combine query conditions
  const conditions: string[] = [`trashed = false`];
  if (mimeCondition) {
    conditions.push(mimeCondition);
  }

  const queryTrimmed = searchQuery.trim();
  if (queryTrimmed) {
    // When user types a search query: search across the entire Drive (name contains query)
    const escapedQuery = queryTrimmed.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    conditions.push(`name contains '${escapedQuery}'`);
  } else if (folderId !== 'all_drive') {
    // When navigating a specific folder (or root), limit to items in that parent
    const safeParent = folderId === 'root' ? "'root' in parents" : `'${folderId}' in parents`;
    conditions.push(safeParent);
  }

  const fullQuery = conditions.join(' and ');

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.append('q', fullQuery);
  url.searchParams.append('fields', 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, parents)');
  url.searchParams.append('pageSize', pageSize.toString());
  url.searchParams.append('orderBy', 'folder,modifiedTime desc');
  url.searchParams.append('supportsAllDrives', 'true');
  url.searchParams.append('includeItemsFromAllDrives', 'true');

  if (pageToken) {
    url.searchParams.append('pageToken', pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    // If token expired, clear cache and throw
    if (res.status === 401 || res.status === 403) {
      cachedAccessToken = null;
    }
    throw new Error(`Erro ao listar arquivos do Google Drive (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Import a Google Doc, PDF or Word file from Drive and parse into DocumentItem
 */
export async function importGoogleDriveFile(
  file: GDriveFileItem,
  cleaningSettings: CleaningSettings = DEFAULT_CLEANING_SETTINGS,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentItem> {
  const token = await requestGoogleDriveAccess();

  onProgress?.(10, `Conectando ao Google Drive: ${file.name}...`);

  // Case 1: Google Docs native file
  if (file.mimeType === 'application/vnd.google-apps.document') {
    onProgress?.(30, 'Exportando Google Docs como texto...');
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
    const res = await fetch(exportUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Erro ao exportar documento do Google (${res.status})`);
    }

    const rawText = await res.text();
    onProgress?.(60, 'Limpando e formatando conteúdo para leitura...');
    
    const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(rawText, 0, cleaningSettings);
    const pageData: PageData = {
      pageNumber: 1,
      originalText: rawText,
      cleanedText: pageCleanedText,
      sentences,
      anomalyCount: pageAnomalies.length,
      detectedAnomalies: pageAnomalies,
    };

    const words = countWords(pageCleanedText);
    const readingMins = estimateReadingMinutes(words);

    return {
      id: `gdoc-${file.id}-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSizeBytes: file.size ? parseInt(file.size, 10) : rawText.length,
      fileSizeFormatted: formatBytes(file.size ? parseInt(file.size, 10) : rawText.length),
      fileType: 'gdoc',
      source: 'gdrive',
      driveFileId: file.id,
      totalPages: 1,
      pages: [pageData],
      createdAt: Date.now(),
      lastReadAt: Date.now(),
      readingProgress: {
        pageIndex: 0,
        sentenceIndex: 0,
        completedPercentage: 0,
      },
      estimatedReadingMinutes: readingMins,
      totalWords: words,
      totalAnomaliesCleaned: pageAnomalies.length,
    };
  } 
  // Case 2: PDF File in Drive
  else if (file.mimeType === 'application/pdf') {
    onProgress?.(30, 'Baixando PDF do Google Drive...');
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Erro ao baixar PDF (${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    onProgress?.(50, 'Processando páginas do PDF...');
    
    const doc = await parsePdfFile(
      arrayBuffer,
      file.name,
      cleaningSettings,
      onProgress
    );

    doc.source = 'gdrive';
    doc.driveFileId = file.id;
    return doc;
  }
  // Case 3: DOCX / Word File in Drive
  else if (
    file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimeType === 'application/msword'
  ) {
    onProgress?.(30, 'Baixando arquivo Word do Google Drive...');
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Erro ao baixar arquivo Word (${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    onProgress?.(50, 'Extraindo texto do documento Word...');
    
    const doc = await parseDocxFile(
      arrayBuffer,
      file.name,
      cleaningSettings,
      onProgress
    );

    doc.source = 'gdrive';
    doc.driveFileId = file.id;
    return doc;
  }
  // Case 4: Plain Text or Markdown file
  else {
    onProgress?.(30, 'Baixando arquivo de texto...');
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Erro ao baixar arquivo (${res.status})`);
    }

    const rawText = await res.text();
    onProgress?.(60, 'Higienizando texto...');
    
    const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(rawText, 0, cleaningSettings);
    const pageData: PageData = {
      pageNumber: 1,
      originalText: rawText,
      cleanedText: pageCleanedText,
      sentences,
      anomalyCount: pageAnomalies.length,
      detectedAnomalies: pageAnomalies,
    };

    const words = countWords(pageCleanedText);
    const readingMins = estimateReadingMinutes(words);

    return {
      id: `txt-${file.id}-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSizeBytes: file.size ? parseInt(file.size, 10) : rawText.length,
      fileSizeFormatted: formatBytes(file.size ? parseInt(file.size, 10) : rawText.length),
      fileType: 'txt',
      source: 'gdrive',
      driveFileId: file.id,
      totalPages: 1,
      pages: [pageData],
      createdAt: Date.now(),
      lastReadAt: Date.now(),
      readingProgress: {
        pageIndex: 0,
        sentenceIndex: 0,
        completedPercentage: 0,
      },
      estimatedReadingMinutes: readingMins,
      totalWords: words,
      totalAnomaliesCleaned: pageAnomalies.length,
    };
  }
}
