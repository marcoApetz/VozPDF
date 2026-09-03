import { DocumentItem, ReaderPreferences, CleaningSettings } from '../types';
import { DEFAULT_CLEANING_SETTINGS } from './textSanitizer';

const DB_NAME = 'VozPdfDB';
const DB_VERSION = 1;
const STORE_DOCS = 'documents';
const STORE_COLLECTIONS = 'collections';
const PREFS_KEY = 'vozpdf_preferences';
const CLEANING_KEY = 'vozpdf_cleaning_settings';
const COLLECTIONS_KEY = 'vozpdf_collections';

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'light',
  fontFamily: 'sans',
  fontSize: 18,
  lineHeight: 1.7,
  textAlign: 'left',
  voiceURI: '',
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  highlightColor: 'yellow',
  autoScroll: true,
  viewMode: 'clean',
  continuousPageRead: true,
  repeatParagraphTwice: false,
  repeatParagraphCount: 2,
};

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update a document in IndexedDB
 */
export async function saveDocument(doc: DocumentItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.put(doc);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Erro ao salvar documento no IndexedDB:', err);
  }
}

/**
 * Get all documents stored locally for offline access
 */
export async function getStoredDocuments(): Promise<DocumentItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.getAll();

      req.onsuccess = () => {
        const docs = req.result as DocumentItem[];
        // Sort by lastReadAt desc
        docs.sort((a, b) => b.lastReadAt - a.lastReadAt);
        resolve(docs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Erro ao listar documentos:', err);
    return [];
  }
}

/**
 * Get a specific document by ID
 */
export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Erro ao buscar documento:', err);
    return null;
  }
}

/**
 * Delete a document from offline storage
 */
export async function deleteDocument(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Erro ao excluir documento:', err);
  }
}

/**
 * Load preferences from localStorage
 */
export function getSavedPreferences(): ReaderPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(prefs: ReaderPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Erro ao salvar preferências:', e);
  }
}

/**
 * Load cleaning settings from localStorage
 */
export function getSavedCleaningSettings(): CleaningSettings {
  if (typeof window === 'undefined') return DEFAULT_CLEANING_SETTINGS;
  try {
    const raw = localStorage.getItem(CLEANING_KEY);
    if (!raw) return DEFAULT_CLEANING_SETTINGS;
    return { ...DEFAULT_CLEANING_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_CLEANING_SETTINGS;
  }
}

/**
 * Save cleaning settings to localStorage
 */
export function saveCleaningSettings(settings: CleaningSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLEANING_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Erro ao salvar configurações de limpeza:', e);
  }
}

/**
 * Save collections to localStorage
 */
export function saveCollections(collections: import('../types').CollectionItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
  } catch (e) {
    console.warn('Erro ao salvar bibliotecas/playlists:', e);
  }
}

/**
 * Get collections from localStorage
 */
export function getSavedCollections(): import('../types').CollectionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
