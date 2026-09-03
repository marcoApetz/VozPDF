import React from 'react';
import { 
  Volume2, 
  BookOpen, 
  FolderOpen, 
  Sparkles, 
  Type, 
  Sun, 
  Moon, 
  Coffee, 
  Eye, 
  Upload,
  ShieldCheck,
  Cloud,
  Layers,
  Repeat
} from 'lucide-react';
import { ReaderPreferences, ReaderTheme, DocumentItem, CollectionItem } from '../types';

interface NavbarProps {
  currentDoc: DocumentItem | null;
  activeCollection: CollectionItem | null;
  activeCollectionDocIndex: number;
  preferences: ReaderPreferences;
  onUpdatePreferences: (prefs: Partial<ReaderPreferences>) => void;
  onOpenLibrary: () => void;
  onOpenGoogleDrive: () => void;
  onOpenCleaningSettings: () => void;
  onOpenAppearance: () => void;
  onNewUpload: () => void;
  anomaliesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDoc,
  activeCollection,
  activeCollectionDocIndex,
  preferences,
  onUpdatePreferences,
  onOpenLibrary,
  onOpenGoogleDrive,
  onOpenCleaningSettings,
  onOpenAppearance,
  onNewUpload,
  anomaliesCount,
}) => {
  const themeIcons: Record<ReaderTheme, React.ReactNode> = {
    light: <Sun className="w-4 h-4 text-amber-500" />,
    sepia: <Coffee className="w-4 h-4 text-amber-700" />,
    dark: <Moon className="w-4 h-4 text-slate-300" />,
    contrast: <Eye className="w-4 h-4 text-yellow-400" />,
  };

  const nextTheme = (): ReaderTheme => {
    const cycle: ReaderTheme[] = ['light', 'sepia', 'dark', 'contrast'];
    const currentIndex = cycle.indexOf(preferences.theme);
    return cycle[(currentIndex + 1) % cycle.length];
  };

  return (
    <header 
      id="app-navbar" 
      className={`border-b transition-colors duration-200 sticky top-0 z-30 ${
        preferences.theme === 'dark' 
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur' 
          : preferences.theme === 'sepia'
          ? 'bg-[#F7F2E7]/95 border-[#E7DFD0] text-[#4A3B32] backdrop-blur'
          : preferences.theme === 'contrast'
          ? 'bg-black border-yellow-400 text-yellow-300'
          : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onNewUpload}
            id="btn-brand-home"
            className="flex items-center gap-2.5 font-semibold text-base tracking-tight hover:opacity-85 transition-opacity focus:outline-none"
            title="Página inicial e novo documento"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
              <Volume2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">VozPDF</span>
          </button>

          {/* Active Collection Playlist Banner */}
          {activeCollection && (
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                <Layers className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{activeCollection.name}</span>
                <span className="font-mono text-[10px]">({activeCollectionDocIndex + 1}/{activeCollection.documentIds.length})</span>
              </span>
            </div>
          )}

          {/* Document Title if open */}
          {currentDoc && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 min-w-0">
              <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
              <span 
                className="text-sm font-medium truncate max-w-xs xl:max-w-md"
                title={currentDoc.title}
              >
                {currentDoc.title}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Offline Badge */}
          <div 
            id="badge-offline-mode"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            title="Processamento e síntese de voz 100% offline no navegador"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>100% Offline</span>
          </div>

          {/* Repeat Paragraph (Study Mode) Toggle */}
          <button
            id="btn-navbar-repeat-paragraph"
            onClick={() => onUpdatePreferences({ repeatParagraphTwice: !preferences.repeatParagraphTwice })}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              preferences.repeatParagraphTwice
                ? 'bg-blue-600 text-white ring-2 ring-blue-400 dark:ring-blue-500 shadow-md font-bold'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
            title="Repetir cada parágrafo 2 vezes (Modo Estudo / Fixação)"
          >
            <Repeat className={`w-3.5 h-3.5 ${preferences.repeatParagraphTwice ? 'animate-spin-slow' : ''}`} />
            <span className="hidden sm:inline">Repetir Parágrafo</span>
            <span className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
              preferences.repeatParagraphTwice ? 'bg-white text-blue-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {preferences.repeatParagraphTwice ? '2x ATIVO' : '2x'}
            </span>
          </button>

          {/* Google Drive button */}
          <button
            id="btn-google-drive"
            onClick={onOpenGoogleDrive}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-all"
            title="Importar documentos do Google Drive e Docs"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Drive</span>
          </button>

          {/* Library & Playlists Button */}
          <button
            id="btn-open-library"
            onClick={onOpenLibrary}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
            title="Bibliotecas e Fila de Leitura Contínua"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Biblioteca</span>
          </button>

          {/* Anomaly Cleaning Rules Badge/Button */}
          <button
            id="btn-cleaning-rules"
            onClick={onOpenCleaningSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
            title="Configurar filtro inteligente de caracteres repetidos"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Filtro</span>
            {anomaliesCount > 0 && (
              <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {anomaliesCount}
              </span>
            )}
          </button>

          {/* Typography / Reading Appearance Button */}
          <button
            id="btn-appearance-settings"
            onClick={onOpenAppearance}
            className="p-2 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
            title="Ajustar Tipografia e Aparência"
            aria-label="Ajustar Tipografia"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Quick Theme Switcher */}
          <button
            id="btn-toggle-theme"
            onClick={() => onUpdatePreferences({ theme: nextTheme() })}
            className="p-2 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
            title={`Tema atual: ${preferences.theme}. Clique para alternar.`}
            aria-label="Alternar tema de cores"
          >
            {themeIcons[preferences.theme]}
          </button>

          {/* New Document Button */}
          <button
            id="btn-new-document-upload"
            onClick={onNewUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs transition-all focus:outline-none"
            title="Anexar novo arquivo PDF ou Word"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Anexar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
