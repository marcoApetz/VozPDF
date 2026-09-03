import React, { useState, useRef } from 'react';
import { 
  FileUp, 
  Sparkles, 
  ShieldCheck, 
  Volume2, 
  BookOpen, 
  FileText, 
  Loader2, 
  Cloud, 
  SlidersHorizontal, 
  FilePlus2, 
  FolderOpen,
  Repeat
} from 'lucide-react';
import { DocumentItem, ReaderPreferences } from '../types';
import { generateSampleDocuments } from '../data/sampleDocs';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  onSelectSample: (doc: DocumentItem) => void;
  onCustomTextSubmit: (title: string, text: string) => void;
  onOpenGoogleDrive: () => void;
  onOpenLibrary: () => void;
  isLoading: boolean;
  loadingProgress: number;
  loadingStatus: string;
  preferences: ReaderPreferences;
  onUpdatePreferences?: (prefs: Partial<ReaderPreferences>) => void;
  onOpenCleaningSettings: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelected,
  onSelectSample,
  onCustomTextSubmit,
  onOpenGoogleDrive,
  onOpenLibrary,
  isLoading,
  loadingProgress,
  loadingStatus,
  preferences,
  onUpdatePreferences,
  onOpenCleaningSettings,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleDocs = generateSampleDocuments();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const name = file.name.toLowerCase();
      if (name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt')) {
        onFileSelected(file);
      } else {
        alert('Formatos suportados: PDF (.pdf), Word (.docx) ou Texto (.txt)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onCustomTextSubmit(customTitle.trim() || 'Texto Personalizado', customText);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Title & Introduction */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Síntese de Voz Offline & Filtro Inteligente de Repetições</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Leitor em Voz Alta Inteligente
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
          Anexe arquivos PDF, DOCX, importe do Google Drive ou crie bibliotecas de leitura sequencial contínua. Caracteres repetidos e ruídos são limpos automaticamente.
        </p>
      </div>

      {/* Tabs & Integration Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            id="tab-upload-file"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Anexar PDF / DOCX / TXT</span>
          </button>
          <button
            id="tab-paste-text"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Colar Texto</span>
          </button>
        </div>

        <button
          onClick={onOpenGoogleDrive}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all shadow-2xs"
        >
          <Cloud className="w-4 h-4 text-blue-600" />
          <span>Acessar Google Drive & Docs</span>
        </button>

        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 transition-all shadow-2xs"
        >
          <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span>Bibliotecas / Playlists</span>
        </button>
      </div>

      {/* Repeat Paragraph (Study Mode) Quick Settings Banner */}
      <div 
        id="banner-repeat-paragraph-mode"
        className={`mb-6 p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs ${
          preferences.repeatParagraphTwice
            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            preferences.repeatParagraphTwice
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Repetir Parágrafo 2x (Modo Estudo e Memorização)
              </h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                preferences.repeatParagraphTwice
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                {preferences.repeatParagraphTwice ? '✓ Ativado' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Quando ativado, a voz lê cada parágrafo 2 vezes seguidas antes de passar para o próximo, ideal para estudo, fixação e aprendizado.
            </p>
          </div>
        </div>

        <button
          id="btn-toggle-study-mode-home"
          type="button"
          onClick={() => onUpdatePreferences?.({ repeatParagraphTwice: !preferences.repeatParagraphTwice })}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs ${
            preferences.repeatParagraphTwice
              ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
          }`}
        >
          {preferences.repeatParagraphTwice ? '✓ Repetição 2x Ativa' : 'Ativar Repetição 2x'}
        </button>
      </div>

      {/* Loading Progress State */}
      {isLoading ? (
        <div 
          id="loading-pdf-container"
          className="p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center space-y-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Processando Documento...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loadingStatus || 'Extraindo e limpando caracteres repetidos...'}
            </p>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-slate-900 dark:bg-white h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
              <span>Carregamento local seguro</span>
              <span>{loadingProgress}%</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'upload' ? (
        /* PDF / DOCX Drag and Drop Area */
        <div
          id="file-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group ${
            isDragging
              ? 'border-slate-900 bg-slate-50 dark:bg-slate-800 scale-[1.01]'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileChange}
            className="hidden"
            id="main-file-input"
          />

          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform border border-slate-200 dark:border-slate-700">
            <FileUp className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
            Arraste ou clique para selecionar PDF ou Word (.docx)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            Suporta arquivos PDF, DOCX (Word), TXT e sincronização direta com o Google Drive.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors">
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>Escolher Arquivo do Dispositivo</span>
          </div>

          {/* Guarantee Badges */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>100% Offline e Privado</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Filtro de Repetições</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Voz com Velocidade Ajustável</span>
            </div>
          </div>
        </div>
      ) : (
        /* Direct Text Paste Area */
        <form 
          id="custom-text-form"
          onSubmit={handleTextSubmit}
          className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Título do Documento
            </label>
            <input
              id="input-custom-title"
              type="text"
              placeholder="Ex: Resumo de Estudo ou Artigo"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Conteúdo do Texto (com caracteres repetidos, quebras ou ruídos)
            </label>
            <textarea
              id="input-custom-content"
              rows={8}
              placeholder="Cole aqui qualquer texto para leitura. Exemplo: 'Oláaaaaaa pessoal....... tudo beeeem??? O leitor vai limpar essas repetições automaticamente.'"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenCleaningSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Regras de Limpeza</span>
            </button>
            <button
              id="btn-submit-custom-text"
              type="submit"
              disabled={!customText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium shadow-xs transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Processar e Ouvir Texto</span>
            </button>
          </div>
        </form>
      )}

      {/* Quick Test Samples */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Exemplos pré-carregados para teste imediato</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sampleDocs.map((sample) => (
            <div
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700 cursor-pointer transition-all flex flex-col justify-between shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h5 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {sample.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {sample.pages[0]?.cleanedText.slice(0, 90)}...
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                  <Sparkles className="w-3 h-3" />
                  {sample.totalAnomaliesCleaned} repetições limpas
                </span>
                <span className="font-medium text-slate-900 dark:text-white hover:underline">
                  Abrir e Ouvir →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
