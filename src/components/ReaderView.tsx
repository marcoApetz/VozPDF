import React, { useRef, useEffect, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  Search, 
  Layers, 
  AlertCircle, 
  Check, 
  RotateCcw,
  Volume2,
  Clock,
  FileText,
  Repeat
} from 'lucide-react';
import { DocumentItem, ReaderPreferences, ViewMode, HighlightColor } from '../types';

interface ReaderViewProps {
  document: DocumentItem;
  currentPageIndex: number;
  currentSentenceIndex: number;
  isPlaying: boolean;
  preferences: ReaderPreferences;
  onPageChange: (pageIndex: number) => void;
  onSentenceClick: (pageIndex: number, sentenceIndex: number) => void;
  onUpdatePreferences: (prefs: Partial<ReaderPreferences>) => void;
  onOpenCleaningSettings: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  document,
  currentPageIndex,
  currentSentenceIndex,
  isPlaying,
  preferences,
  onPageChange,
  onSentenceClick,
  onUpdatePreferences,
  onOpenCleaningSettings,
}) => {
  const activeSentenceRef = useRef<HTMLSpanElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const currentPage = document.pages[currentPageIndex] || document.pages[0];
  const totalPages = document.pages.length;

  // Auto-scroll to active sentence when reading
  useEffect(() => {
    if (preferences.autoScroll && activeSentenceRef.current && isPlaying) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSentenceIndex, currentPageIndex, isPlaying, preferences.autoScroll]);

  // Typography font class
  const getFontFamilyClass = () => {
    switch (preferences.fontFamily) {
      case 'serif':
        return 'font-reader-serif';
      case 'dyslexic':
        return 'font-reader-dyslexic';
      default:
        return 'font-reader-sans';
    }
  };

  // Highlight color styling
  const getHighlightBgClass = (color: HighlightColor) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-200/80 dark:bg-blue-900/60 text-blue-950 dark:text-blue-100 ring-2 ring-blue-400';
      case 'emerald':
        return 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-400';
      case 'amber':
        return 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400';
      case 'purple':
        return 'bg-purple-200/80 dark:bg-purple-900/60 text-purple-950 dark:text-purple-100 ring-2 ring-purple-400';
      default:
        // Yellow
        return 'bg-yellow-200/90 dark:bg-yellow-900/70 text-yellow-950 dark:text-yellow-100 ring-2 ring-yellow-400';
    }
  };

  // Theme container classes
  const getThemeClasses = () => {
    switch (preferences.theme) {
      case 'dark':
        return {
          wrapper: 'bg-[#121214] text-neutral-200',
          paper: 'bg-[#1C1C1F] border-neutral-800 text-neutral-100 shadow-xl',
          subtle: 'text-neutral-400',
          border: 'border-neutral-800',
          toolbar: 'bg-[#18181B] border-neutral-800 text-neutral-200',
          sentenceHover: 'hover:bg-neutral-800/80',
        };
      case 'sepia':
        return {
          wrapper: 'bg-[#EFE9DC] text-[#3D312A]',
          paper: 'bg-[#FAF6ED] border-[#E2D8C3] text-[#3B2F2F] shadow-md',
          subtle: 'text-[#8A7968]',
          border: 'border-[#E2D8C3]',
          toolbar: 'bg-[#F4ECE0] border-[#E2D8C3] text-[#3D312A]',
          sentenceHover: 'hover:bg-[#EFE8D8]',
        };
      case 'contrast':
        return {
          wrapper: 'bg-black text-yellow-300',
          paper: 'bg-black border-yellow-400 text-yellow-300 shadow-none',
          subtle: 'text-yellow-500',
          border: 'border-yellow-400',
          toolbar: 'bg-neutral-900 border-yellow-400 text-yellow-300',
          sentenceHover: 'hover:bg-neutral-900',
        };
      default:
        // Light
        return {
          wrapper: 'bg-[#F4F5F7] text-neutral-900',
          paper: 'bg-white border-neutral-200 text-neutral-800 shadow-sm',
          subtle: 'text-neutral-500',
          border: 'border-neutral-200',
          toolbar: 'bg-white border-neutral-200 text-neutral-700',
          sentenceHover: 'hover:bg-neutral-100/70',
        };
    }
  };

  const themeStyle = getThemeClasses();

  return (
    <div className={`min-h-[calc(100vh-140px)] transition-colors duration-200 ${themeStyle.wrapper} pb-32 pt-4 px-2 sm:px-6`}>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Reading Navigation Bar */}
        <div 
          id="reader-top-bar"
          className={`p-3 rounded-2xl border ${themeStyle.toolbar} flex flex-wrap items-center justify-between gap-3 shadow-xs`}
        >
          {/* Page Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="btn-prev-page"
              disabled={currentPageIndex <= 0}
              onClick={() => onPageChange(currentPageIndex - 1)}
              className="p-1.5 rounded-lg border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Página Anterior"
              aria-label="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800/80">
              <span>Pág.</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPageIndex + 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    onPageChange(val - 1);
                  }
                }}
                className="w-10 text-center font-bold bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
              />
              <span className="text-neutral-400">/ {totalPages}</span>
            </div>

            <button
              id="btn-next-page"
              disabled={currentPageIndex >= totalPages - 1}
              onClick={() => onPageChange(currentPageIndex + 1)}
              className="p-1.5 rounded-lg border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Próxima Página"
              aria-label="Próxima Página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode & Repeat Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl text-xs font-medium">
            <button
              id="btn-view-mode-clean"
              onClick={() => onUpdatePreferences({ viewMode: 'clean' })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                preferences.viewMode === 'clean'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
              title="Modo Leitura Limpa"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Leitura</span>
            </button>

            <button
              id="btn-view-mode-anomalies"
              onClick={() => onUpdatePreferences({ viewMode: 'anomalies' })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                preferences.viewMode === 'anomalies'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
              title="Ver caracteres repetidos e correções"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Análise de Ruídos</span>
              {currentPage.anomalyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  {currentPage.anomalyCount}
                </span>
              )}
            </button>

            {/* Repeat Paragraph (Study Mode) Button inside Reader Top Bar */}
            <button
              id="btn-reader-repeat-paragraph"
              onClick={() => onUpdatePreferences({ repeatParagraphTwice: !preferences.repeatParagraphTwice })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                preferences.repeatParagraphTwice
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
              }`}
              title="Ativar/Desativar repetição de cada parágrafo 2 vezes seguidas"
            >
              <Repeat className={`w-3.5 h-3.5 ${preferences.repeatParagraphTwice ? 'animate-spin-slow' : ''}`} />
              <span>Repetir 2x</span>
              <span className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                preferences.repeatParagraphTwice ? 'bg-white text-blue-700' : 'bg-neutral-200 dark:bg-neutral-700'
              }`}>
                {preferences.repeatParagraphTwice ? 'ATIVO' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Quick Info & Search */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Buscar no texto da página"
            >
              <Search className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>~{document.estimatedReadingMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Search Bar Collapsible */}
        {showSearch && (
          <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center gap-2 animate-in fade-in duration-150">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar palavras na página atual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        {/* Anomalies Info Card if mode is 'anomalies' */}
        {preferences.viewMode === 'anomalies' && (
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Detecção e Limpeza de Caracteres Repetidos na Página {currentPageIndex + 1}</span>
              </div>
              <button
                onClick={onOpenCleaningSettings}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
              >
                Ajustar Sensibilidade →
              </button>
            </div>

            {currentPage.detectedAnomalies.length === 0 ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Nenhum caractere repetido excessivo ou ruído detectado nesta página. Texto limpo!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {currentPage.detectedAnomalies.map((anomaly) => (
                  <div 
                    key={anomaly.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-indigo-100 dark:border-neutral-700 flex items-start gap-2 shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {anomaly.description}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                        Original: <span className="line-through text-red-500 bg-red-50 dark:bg-red-950/40 px-1 rounded">{anomaly.original.slice(0, 30)}</span> → <span className="text-emerald-600 dark:text-emerald-400 font-bold">{anomaly.replacement || '[removido]'}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reading Paper Canvas */}
        <main
          id="reader-paper-canvas"
          ref={readerContainerRef}
          className={`p-6 sm:p-12 md:p-16 rounded-3xl border ${themeStyle.paper} transition-all min-h-[600px]`}
          style={{
            fontSize: `${preferences.fontSize}px`,
            lineHeight: preferences.lineHeight,
            textAlign: preferences.textAlign,
          }}
        >
          {/* Document Header in page */}
          <div className="border-b pb-4 mb-6 flex justify-between items-center text-xs font-mono opacity-60">
            <span className="truncate max-w-sm">{document.title}</span>
            <span>Página {currentPageIndex + 1} de {totalPages}</span>
          </div>

          {/* Repeat Paragraph Active Notice */}
          {preferences.repeatParagraphTwice && (
            <div className="mb-6 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-blue-600 shrink-0 animate-spin-slow" />
                <span className="font-semibold">Modo Estudo Ativo:</span>
                <span>A voz repetirá cada parágrafo 2 vezes seguidas.</span>
              </div>
              <button
                onClick={() => onUpdatePreferences({ repeatParagraphTwice: false })}
                className="underline hover:text-blue-900 font-bold shrink-0"
              >
                Desativar
              </button>
            </div>
          )}

          {/* Render Sentences */}
          {currentPage.sentences.length === 0 ? (
            <div className="py-20 text-center text-neutral-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Esta página não possui texto extraível.</p>
            </div>
          ) : (
            <div className={`space-y-6 ${getFontFamilyClass()}`}>
              {/* Group sentences by paragraphIndex */}
              {(() => {
                // Group sentences into paragraphs
                const paragraphs: { pIndex: number; sentences: { sentence: typeof currentPage.sentences[0]; originalIdx: number }[] }[] = [];
                
                currentPage.sentences.forEach((sentence, idx) => {
                  const pIdx = sentence.paragraphIndex ?? 0;
                  const lastP = paragraphs[paragraphs.length - 1];
                  if (lastP && lastP.pIndex === pIdx) {
                    lastP.sentences.push({ sentence, originalIdx: idx });
                  } else {
                    paragraphs.push({ pIndex: pIdx, sentences: [{ sentence, originalIdx: idx }] });
                  }
                });

                return paragraphs.map((p, pGroupIdx) => {
                  const firstSentenceIdx = p.sentences[0]?.originalIdx ?? 0;
                  const isCurrentParagraphActive = p.sentences.some(s => s.originalIdx === currentSentenceIndex);

                  return (
                    <div 
                      key={pGroupIdx} 
                      className={`group relative p-2 sm:p-3 -mx-2 sm:-mx-3 rounded-2xl transition-all duration-200 ${
                        isCurrentParagraphActive 
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/40' 
                          : 'hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30'
                      }`}
                    >
                      {/* Floating quick action to repeat this paragraph */}
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSentenceClick(currentPageIndex, firstSentenceIdx);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-200 border border-neutral-200 dark:border-neutral-700 shadow-xs hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 transition-all"
                          title="Repetir / Ouvir este parágrafo"
                        >
                          <Repeat className="w-3 h-3 text-blue-500" />
                          <span>Repetir Parágrafo</span>
                        </button>
                      </div>

                      <p className="leading-relaxed">
                        {p.sentences.map(({ sentence, originalIdx }) => {
                          const isActive = originalIdx === currentSentenceIndex;
                          const matchesSearch = searchQuery && sentence.cleanedText.toLowerCase().includes(searchQuery.toLowerCase());

                          return (
                            <span
                              key={sentence.id}
                              ref={isActive ? activeSentenceRef : null}
                              onClick={() => onSentenceClick(currentPageIndex, originalIdx)}
                              className={`inline cursor-pointer rounded-md transition-all duration-150 px-1 py-0.5 mr-1 ${
                                isActive
                                  ? getHighlightBgClass(preferences.highlightColor)
                                  : matchesSearch
                                  ? 'bg-amber-100 dark:bg-amber-950/60 ring-1 ring-amber-400'
                                  : `${themeStyle.sentenceHover}`
                              }`}
                              title="Clique para ler a partir desta frase"
                            >
                              {sentence.cleanedText}
                              {' '}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Quick Page Jump Footer */}
          <div className="mt-16 pt-6 border-t flex items-center justify-between text-xs text-neutral-400">
            <button
              disabled={currentPageIndex <= 0}
              onClick={() => onPageChange(currentPageIndex - 1)}
              className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Página anterior
            </button>

            <span className="font-semibold">{currentPage.sentences.length} frases nesta página</span>

            <button
              disabled={currentPageIndex >= totalPages - 1}
              onClick={() => onPageChange(currentPageIndex + 1)}
              className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20"
            >
              Próxima página <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
