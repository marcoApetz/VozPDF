import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { ReaderView } from './components/ReaderView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { CleaningSettingsModal } from './components/CleaningSettingsModal';
import { AppearanceModal } from './components/AppearanceModal';
import { LibraryModal } from './components/LibraryModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';

import { 
  DocumentItem, 
  CollectionItem,
  ReaderPreferences, 
  CleaningSettings, 
  VoiceOption,
  PageData
} from './types';
import { 
  getSavedPreferences, 
  savePreferences, 
  getSavedCleaningSettings, 
  saveCleaningSettings, 
  getStoredDocuments, 
  saveDocument, 
  deleteDocument,
  getSavedCollections,
  saveCollections,
  DEFAULT_PREFERENCES
} from './utils/storage';
import { parsePdfFile } from './utils/pdfParser';
import { parseDocxFile } from './utils/docxParser';
import { sanitizeText, splitIntoSentences, countWords, estimateReadingMinutes } from './utils/textSanitizer';
import { speechEngine } from './utils/speechEngine';
import { generateSampleDocuments } from './data/sampleDocs';
import { initGoogleDriveAuth } from './utils/googleDriveService';

export default function App() {
  const [preferences, setPreferences] = useState<ReaderPreferences>(getSavedPreferences);
  const [cleaningSettings, setCleaningSettings] = useState<CleaningSettings>(getSavedCleaningSettings);
  
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [currentDoc, setCurrentDoc] = useState<DocumentItem | null>(null);
  
  // Active Collection / Playlist Queue State
  const [activeCollection, setActiveCollection] = useState<CollectionItem | null>(null);
  const [activeCollectionDocIndex, setActiveCollectionDocIndex] = useState<number>(0);

  // Active reading state
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Available voices
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  // Loading states
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  // Modals
  const [showCleaningModal, setShowCleaningModal] = useState<boolean>(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState<boolean>(false);
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState<boolean>(false);

  // Refs for sequential playback access inside speech engine callbacks
  const activeCollectionRef = useRef<CollectionItem | null>(activeCollection);
  const activeCollectionDocIndexRef = useRef<number>(activeCollectionDocIndex);
  const documentsRef = useRef<DocumentItem[]>(documents);

  useEffect(() => {
    activeCollectionRef.current = activeCollection;
    activeCollectionDocIndexRef.current = activeCollectionDocIndex;
    documentsRef.current = documents;
  }, [activeCollection, activeCollectionDocIndex, documents]);

  // Advance to next document in active collection
  const playNextDocumentInCollection = useCallback(() => {
    const col = activeCollectionRef.current;
    const currentIndex = activeCollectionDocIndexRef.current;
    const allDocs = documentsRef.current;

    if (!col || col.documentIds.length === 0) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex < col.documentIds.length) {
      const nextDocId = col.documentIds[nextIndex];
      const nextDoc = allDocs.find((d) => d.id === nextDocId);
      if (nextDoc) {
        setActiveCollectionDocIndex(nextIndex);
        setCurrentDoc(nextDoc);
        setCurrentPageIndex(0);
        setCurrentSentenceIndex(0);
        speechEngine.setDocument(nextDoc.pages, 0, 0);
        setTimeout(() => {
          speechEngine.play(0, 0);
        }, 500);
      }
    } else {
      // Finished entire collection
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, []);

  // Initialize DB, Collections and Voices
  useEffect(() => {
    // 1. Load documents from IndexedDB
    getStoredDocuments().then((stored) => {
      if (stored && stored.length > 0) {
        setDocuments(stored);
      } else {
        const samples = generateSampleDocuments();
        setDocuments(samples);
        samples.forEach((sample) => saveDocument(sample));
      }
    });

    // 2. Load collections
    const storedCollections = getSavedCollections();
    if (storedCollections && storedCollections.length > 0) {
      setCollections(storedCollections);
    } else {
      // Create a default starter collection
      const initialCollection: CollectionItem = {
        id: 'col_default',
        name: 'Minha Fila de Leitura',
        description: 'Biblioteca principal de documentos sequenciais',
        documentIds: ['sample-1', 'sample-2'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setCollections([initialCollection]);
      saveCollections([initialCollection]);
    }

    // 3. Load voices
    const updateVoices = () => {
      const v = speechEngine.getVoices();
      setVoices(v);
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // 4. Initialize Google Drive client auth
    initGoogleDriveAuth();
  }, []);

  // Sync speech engine config when preferences change
  useEffect(() => {
    speechEngine.setConfig({
      rate: preferences.speechRate,
      pitch: preferences.speechPitch,
      volume: preferences.speechVolume,
      voiceURI: preferences.voiceURI,
      continuousPageRead: preferences.continuousPageRead,
      repeatParagraphTwice: preferences.repeatParagraphTwice,
      repeatParagraphCount: preferences.repeatParagraphCount,
    });
    savePreferences(preferences);
  }, [preferences]);

  // Save cleaning settings
  useEffect(() => {
    saveCleaningSettings(cleaningSettings);
  }, [cleaningSettings]);

  // Setup speech engine callbacks
  useEffect(() => {
    speechEngine.setCallbacks({
      onSentenceStart: (pageIdx, sentIdx) => {
        setCurrentPageIndex(pageIdx);
        setCurrentSentenceIndex(sentIdx);
      },
      onStateChange: (playing, paused) => {
        setIsPlaying(playing);
        setIsPaused(paused);
      },
      onDocEnd: () => {
        // Document finished - check if part of an active collection playlist!
        if (activeCollectionRef.current) {
          playNextDocumentInCollection();
        } else {
          setIsPlaying(false);
          setIsPaused(false);
        }
      },
      onError: (err) => {
        console.warn('Speech engine error:', err);
      },
    });
  }, [playNextDocumentInCollection]);

  // Update speech engine document when currentDoc changes
  useEffect(() => {
    if (currentDoc) {
      speechEngine.setDocument(currentDoc.pages, currentPageIndex, currentSentenceIndex);
    } else {
      speechEngine.stop();
    }
  }, [currentDoc]);

  // Handle local file upload (PDF, DOCX, TXT)
  const handleFileSelected = async (file: File) => {
    setIsLoadingFile(true);
    setLoadingProgress(10);
    setLoadingStatus(`Processando arquivo "${file.name}" offline...`);

    try {
      let doc: DocumentItem;
      const fileNameLower = file.name.toLowerCase();

      if (fileNameLower.endsWith('.docx')) {
        doc = await parseDocxFile(
          file,
          file.name,
          cleaningSettings,
          (progress, status) => {
            setLoadingProgress(progress);
            setLoadingStatus(status);
          }
        );
      } else if (fileNameLower.endsWith('.txt')) {
        const text = await file.text();
        const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
          text,
          0,
          cleaningSettings
        );
        const words = countWords(pageCleanedText);
        doc = {
          id: `doc_${Date.now()}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          fileSizeBytes: file.size,
          fileSizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
          fileType: 'txt',
          source: 'local',
          totalPages: 1,
          pages: [{
            pageNumber: 1,
            originalText: text,
            cleanedText: pageCleanedText,
            sentences,
            anomalyCount: pageAnomalies.length,
            detectedAnomalies: pageAnomalies,
          }],
          createdAt: Date.now(),
          lastReadAt: Date.now(),
          readingProgress: {
            pageIndex: 0,
            sentenceIndex: 0,
            completedPercentage: 0,
          },
          estimatedReadingMinutes: estimateReadingMinutes(words),
          totalWords: words,
          totalAnomaliesCleaned: pageAnomalies.length,
        };
      } else {
        // Default PDF
        doc = await parsePdfFile(
          file, 
          file.name, 
          cleaningSettings, 
          (progress, status) => {
            setLoadingProgress(progress);
            setLoadingStatus(status);
          }
        );
      }

      // Save to IndexedDB
      await saveDocument(doc);

      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
      setCurrentDoc(doc);
      setActiveCollection(null); // Clear active collection when opening single doc
      setCurrentPageIndex(0);
      setCurrentSentenceIndex(0);
      speechEngine.setDocument(doc.pages, 0, 0);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Não foi possível ler o arquivo. Verifique se o formato é suportado (PDF, DOCX ou TXT).');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Handle sample document selection
  const handleSelectSample = (sample: DocumentItem) => {
    setCurrentDoc(sample);
    setActiveCollection(null);
    setCurrentPageIndex(0);
    setCurrentSentenceIndex(0);
    speechEngine.setDocument(sample.pages, 0, 0);
  };

  // Handle direct text paste
  const handleCustomTextSubmit = async (title: string, rawText: string) => {
    const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
      rawText,
      0,
      cleaningSettings
    );

    const words = countWords(pageCleanedText);
    const pages: PageData[] = [{
      pageNumber: 1,
      originalText: rawText,
      cleanedText: pageCleanedText,
      sentences,
      anomalyCount: pageAnomalies.length,
      detectedAnomalies: pageAnomalies,
    }];

    const doc: DocumentItem = {
      id: `text-${Date.now()}`,
      title,
      fileName: `${title.toLowerCase().replace(/\s+/g, '_')}.txt`,
      fileSizeBytes: rawText.length,
      fileSizeFormatted: `${(rawText.length / 1024).toFixed(1)} KB`,
      fileType: 'txt',
      source: 'custom_text',
      totalPages: 1,
      pages,
      createdAt: Date.now(),
      lastReadAt: Date.now(),
      readingProgress: {
        pageIndex: 0,
        sentenceIndex: 0,
        completedPercentage: 0,
      },
      estimatedReadingMinutes: estimateReadingMinutes(words),
      totalWords: words,
      totalAnomaliesCleaned: pageAnomalies.length,
    };

    await saveDocument(doc);
    setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
    setCurrentDoc(doc);
    setActiveCollection(null);
    setCurrentPageIndex(0);
    setCurrentSentenceIndex(0);
    speechEngine.setDocument(pages, 0, 0);
  };

  // Handle document imported from Google Drive
  const handleDocumentImported = async (doc: DocumentItem) => {
    await saveDocument(doc);
    setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
    setCurrentDoc(doc);
    setActiveCollection(null);
    setCurrentPageIndex(0);
    setCurrentSentenceIndex(0);
    speechEngine.setDocument(doc.pages, 0, 0);
  };

  // Collection CRUD handlers
  const handleCreateCollection = (name: string, description?: string) => {
    const newCollection: CollectionItem = {
      id: `col_${Date.now()}`,
      name,
      description,
      documentIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newCollection, ...collections];
    setCollections(updated);
    saveCollections(updated);
  };

  const handleUpdateCollection = (collection: CollectionItem) => {
    const updated = collections.map((c) => (c.id === collection.id ? collection : c));
    setCollections(updated);
    saveCollections(updated);
  };

  const handleDeleteCollection = (collectionId: string) => {
    const updated = collections.filter((c) => c.id !== collectionId);
    setCollections(updated);
    saveCollections(updated);
    if (activeCollection?.id === collectionId) {
      setActiveCollection(null);
    }
  };

  const handlePlayCollection = (collection: CollectionItem, startDocIndex = 0) => {
    if (collection.documentIds.length === 0) {
      alert('Esta biblioteca ainda não possui documentos. Adicione documentos para começar a reprodução sequencial.');
      return;
    }

    const firstDocId = collection.documentIds[startDocIndex];
    const targetDoc = documents.find((d) => d.id === firstDocId);
    if (targetDoc) {
      setActiveCollection(collection);
      setActiveCollectionDocIndex(startDocIndex);
      setCurrentDoc(targetDoc);
      setCurrentPageIndex(0);
      setCurrentSentenceIndex(0);
      speechEngine.setDocument(targetDoc.pages, 0, 0);
      setShowLibraryModal(false);
      setTimeout(() => {
        speechEngine.play(0, 0);
      }, 300);
    }
  };

  // Playback handlers
  const handlePlay = () => {
    if (!currentDoc) return;
    speechEngine.play(currentPageIndex, currentSentenceIndex);
  };

  const handlePause = () => {
    speechEngine.pause();
  };

  const handleResume = () => {
    speechEngine.resume();
  };

  const handleStop = () => {
    speechEngine.stop();
  };

  const handlePreviousSentence = () => {
    speechEngine.previousSentence();
  };

  const handleNextSentence = () => {
    speechEngine.nextSentence();
  };

  const handleSentenceClick = (pageIdx: number, sentIdx: number) => {
    setCurrentPageIndex(pageIdx);
    setCurrentSentenceIndex(sentIdx);
    speechEngine.jumpTo(pageIdx, sentIdx);
    speechEngine.play(pageIdx, sentIdx);
  };

  const handlePageChange = (newPageIndex: number) => {
    if (!currentDoc) return;
    const bounded = Math.max(0, Math.min(currentDoc.pages.length - 1, newPageIndex));
    setCurrentPageIndex(bounded);
    setCurrentSentenceIndex(0);
    speechEngine.jumpTo(bounded, 0);
  };

  // Re-apply cleaning rules across document
  const handleReapplyCleaning = () => {
    if (!currentDoc) return;

    const updatedPages: PageData[] = currentDoc.pages.map((p, idx) => {
      const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
        p.originalText,
        idx,
        cleaningSettings
      );
      return {
        ...p,
        cleanedText: pageCleanedText,
        sentences,
        anomalyCount: pageAnomalies.length,
        detectedAnomalies: pageAnomalies,
      };
    });

    const totalAnomalies = updatedPages.reduce((acc, p) => acc + p.anomalyCount, 0);
    const updatedDoc: DocumentItem = {
      ...currentDoc,
      pages: updatedPages,
      totalAnomaliesCleaned: totalAnomalies,
    };

    setCurrentDoc(updatedDoc);
    saveDocument(updatedDoc);
    speechEngine.setDocument(updatedPages, currentPageIndex, currentSentenceIndex);
  };

  // Delete doc from offline library
  const handleDeleteDocument = async (docId: string) => {
    await deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    // Also remove from any collection playlists
    const updatedCollections = collections.map((col) => ({
      ...col,
      documentIds: col.documentIds.filter((id) => id !== docId),
    }));
    setCollections(updatedCollections);
    saveCollections(updatedCollections);

    if (currentDoc?.id === docId) {
      setCurrentDoc(null);
      speechEngine.stop();
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying && !isPaused) {
          handlePause();
        } else if (isPaused) {
          handleResume();
        } else {
          handlePlay();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousSentence();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextSentence();
      } else if (e.code === 'Escape') {
        setShowCleaningModal(false);
        setShowAppearanceModal(false);
        setShowLibraryModal(false);
        setShowGoogleDriveModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, currentDoc, currentPageIndex, currentSentenceIndex]);

  const handleUpdatePreferences = (partial: Partial<ReaderPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...partial }));
  };

  const totalAnomaliesInCurrentDoc = currentDoc ? currentDoc.totalAnomaliesCleaned : 0;

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        preferences.theme === 'dark'
          ? 'bg-[#0F172A] text-slate-100'
          : preferences.theme === 'sepia'
          ? 'bg-[#FAF6ED] text-[#3D312A]'
          : preferences.theme === 'contrast'
          ? 'bg-black text-yellow-300'
          : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Top Navbar */}
      <Navbar
        currentDoc={currentDoc}
        activeCollection={activeCollection}
        activeCollectionDocIndex={activeCollectionDocIndex}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onOpenLibrary={() => setShowLibraryModal(true)}
        onOpenGoogleDrive={() => setShowGoogleDriveModal(true)}
        onOpenCleaningSettings={() => setShowCleaningModal(true)}
        onOpenAppearance={() => setShowAppearanceModal(true)}
        onNewUpload={() => {
          setCurrentDoc(null);
          setActiveCollection(null);
        }}
        anomaliesCount={totalAnomaliesInCurrentDoc}
      />

      {/* Main Content Area */}
      <div className="flex-1">
        {currentDoc ? (
          <ReaderView
            document={currentDoc}
            currentPageIndex={currentPageIndex}
            currentSentenceIndex={currentSentenceIndex}
            isPlaying={isPlaying}
            preferences={preferences}
            onPageChange={handlePageChange}
            onSentenceClick={handleSentenceClick}
            onUpdatePreferences={handleUpdatePreferences}
            onOpenCleaningSettings={() => setShowCleaningModal(true)}
          />
        ) : (
          <UploadZone
            onFileSelected={handleFileSelected}
            onSelectSample={handleSelectSample}
            onCustomTextSubmit={handleCustomTextSubmit}
            onOpenGoogleDrive={() => setShowGoogleDriveModal(true)}
            onOpenLibrary={() => setShowLibraryModal(true)}
            isLoading={isLoadingFile}
            loadingProgress={loadingProgress}
            loadingStatus={loadingStatus}
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            onOpenCleaningSettings={() => setShowCleaningModal(true)}
          />
        )}
      </div>

      {/* Floating / Fixed Bottom Audio Player Bar */}
      {currentDoc && (
        <AudioPlayerBar
          isPlaying={isPlaying}
          isPaused={isPaused}
          document={currentDoc}
          currentPageIndex={currentPageIndex}
          currentSentenceIndex={currentSentenceIndex}
          availableVoices={voices}
          preferences={preferences}
          onPlay={handlePlay}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onPreviousSentence={handlePreviousSentence}
          onNextSentence={handleNextSentence}
          onUpdatePreferences={handleUpdatePreferences}
          onSeekSentence={(p, s) => {
            setCurrentPageIndex(p);
            setCurrentSentenceIndex(s);
            speechEngine.jumpTo(p, s);
          }}
        />
      )}

      {/* Cleaning Settings Modal */}
      <CleaningSettingsModal
        isOpen={showCleaningModal}
        settings={cleaningSettings}
        onClose={() => setShowCleaningModal(false)}
        onSaveSettings={(newSettings) => {
          setCleaningSettings(newSettings);
        }}
        onReapplyCleaning={handleReapplyCleaning}
      />

      {/* Appearance & Typography Modal */}
      <AppearanceModal
        isOpen={showAppearanceModal}
        preferences={preferences}
        onClose={() => setShowAppearanceModal(false)}
        onUpdatePreferences={handleUpdatePreferences}
      />

      {/* Offline Library & Playlists Modal */}
      <LibraryModal
        isOpen={showLibraryModal}
        documents={documents}
        collections={collections}
        currentDocId={currentDoc?.id}
        activeCollectionId={activeCollection?.id}
        onClose={() => setShowLibraryModal(false)}
        onSelectDocument={(doc) => {
          setCurrentDoc(doc);
          setActiveCollection(null);
          setCurrentPageIndex(0);
          setCurrentSentenceIndex(0);
          speechEngine.setDocument(doc.pages, 0, 0);
        }}
        onDeleteDocument={handleDeleteDocument}
        onNewDocument={() => {
          setCurrentDoc(null);
          setActiveCollection(null);
        }}
        onOpenGoogleDrive={() => setShowGoogleDriveModal(true)}
        onCreateCollection={handleCreateCollection}
        onUpdateCollection={handleUpdateCollection}
        onDeleteCollection={handleDeleteCollection}
        onPlayCollection={handlePlayCollection}
      />

      {/* Google Drive & Docs Picker Modal */}
      <GoogleDriveModal
        isOpen={showGoogleDriveModal}
        onClose={() => setShowGoogleDriveModal(false)}
        onDocumentImported={handleDocumentImported}
        cleaningSettings={cleaningSettings}
      />
    </div>
  );
}
