import React from 'react';
import { 
  Type, 
  Sun, 
  Moon, 
  Coffee, 
  Eye, 
  Check, 
  X, 
  AlignLeft, 
  AlignJustify,
  Palette,
  Repeat
} from 'lucide-react';
import { ReaderPreferences, ReaderTheme, ReaderFontFamily, HighlightColor } from '../types';

interface AppearanceModalProps {
  isOpen: boolean;
  preferences: ReaderPreferences;
  onClose: () => void;
  onUpdatePreferences: (prefs: Partial<ReaderPreferences>) => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  preferences,
  onClose,
  onUpdatePreferences,
}) => {
  if (!isOpen) return null;

  const themes: { id: ReaderTheme; label: string; icon: React.ReactNode; previewBg: string; previewText: string }[] = [
    { id: 'light', label: 'Claro', icon: <Sun className="w-4 h-4 text-amber-500" />, previewBg: 'bg-white', previewText: 'text-neutral-900 border-neutral-200' },
    { id: 'sepia', label: 'Papel Sépia', icon: <Coffee className="w-4 h-4 text-amber-700" />, previewBg: 'bg-[#FAF6ED]', previewText: 'text-[#3D312A] border-[#E2D8C3]' },
    { id: 'dark', label: 'Noturno', icon: <Moon className="w-4 h-4 text-indigo-400" />, previewBg: 'bg-[#18181B]', previewText: 'text-neutral-100 border-neutral-700' },
    { id: 'contrast', label: 'Alto Contraste', icon: <Eye className="w-4 h-4 text-yellow-400" />, previewBg: 'bg-black', previewText: 'text-yellow-300 border-yellow-400' },
  ];

  const fonts: { id: ReaderFontFamily; label: string; sub: string; className: string }[] = [
    { id: 'sans', label: 'Moderna (Sans)', sub: 'Plus Jakarta Sans', className: 'font-reader-sans' },
    { id: 'serif', label: 'Livro Clássico (Serif)', sub: 'Lora Georgia', className: 'font-reader-serif' },
    { id: 'dyslexic', label: 'Alta Legibilidade', sub: 'Lexend Acessível', className: 'font-reader-dyslexic' },
  ];

  const colors: { id: HighlightColor; label: string; bg: string }[] = [
    { id: 'yellow', label: 'Amarelo Suave', bg: 'bg-yellow-300' },
    { id: 'blue', label: 'Azul Sereno', bg: 'bg-blue-300' },
    { id: 'emerald', label: 'Verde Esmeralda', bg: 'bg-emerald-300' },
    { id: 'amber', label: 'Âmbar Quente', bg: 'bg-amber-300' },
    { id: 'purple', label: 'Roxo Lavanda', bg: 'bg-purple-300' },
  ];

  return (
    <div 
      id="appearance-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-slate-900 dark:text-slate-100 p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Aparência & Tipografia</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Personalize o layout para máxima comodidade visual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Tema de Leitura
          </label>
          <div className="grid grid-cols-2 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdatePreferences({ theme: t.id })}
                className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-all ${t.previewBg} ${t.previewText} ${
                  preferences.theme === t.id ? 'ring-1 ring-slate-900 dark:ring-white font-medium shadow-xs' : 'opacity-80 hover:opacity-100'
                }`}
              >
                {t.icon}
                <span className="text-xs">{t.label}</span>
                {preferences.theme === t.id && <Check className="w-3.5 h-3.5 ml-auto text-slate-900 dark:text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Fonte do Texto
          </label>
          <div className="space-y-1.5">
            {fonts.map((f) => (
              <button
                key={f.id}
                onClick={() => onUpdatePreferences({ fontFamily: f.id })}
                className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                  preferences.fontFamily === f.id
                    ? 'border-slate-900 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={f.className}>
                  <div className="text-xs font-semibold">{f.label}</div>
                  <div className="text-[10px] text-slate-400">{f.sub}</div>
                </div>
                {preferences.fontFamily === f.id && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Tamanho da Fonte</span>
            <span className="font-mono">{preferences.fontSize}px</span>
          </div>
          <input
            type="range"
            min="14"
            max="30"
            step="1"
            value={preferences.fontSize}
            onChange={(e) => onUpdatePreferences({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-slate-900 dark:accent-slate-100 cursor-pointer"
          />
        </div>

        {/* Line Height Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Espaçamento de Linhas</span>
            <span className="font-mono">{preferences.lineHeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="1.4"
            max="2.2"
            step="0.1"
            value={preferences.lineHeight}
            onChange={(e) => onUpdatePreferences({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-slate-900 dark:accent-slate-100 cursor-pointer"
          />
        </div>

        {/* Text Alignment */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Alinhamento do Texto
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdatePreferences({ textAlign: 'left' })}
              className={`p-2 rounded-lg border flex items-center justify-center gap-2 text-xs font-medium ${
                preferences.textAlign === 'left'
                  ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Esquerda</span>
            </button>
            <button
              onClick={() => onUpdatePreferences({ textAlign: 'justify' })}
              className={`p-2 rounded-lg border flex items-center justify-center gap-2 text-xs font-medium ${
                preferences.textAlign === 'justify'
                  ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Justificado</span>
            </button>
          </div>
        </div>

        {/* Auto Scroll Toggle */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-900 dark:text-slate-200">Rolagem Automática com a Voz</div>
            <div className="text-[10px] text-slate-400">Mantém a frase falada no centro da tela</div>
          </div>
          <input
            type="checkbox"
            checked={preferences.autoScroll}
            onChange={(e) => onUpdatePreferences({ autoScroll: e.target.checked })}
            className="w-4 h-4 accent-slate-900 cursor-pointer rounded"
          />
        </div>

        {/* Repeat Paragraph (Study Mode) Toggle */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Repeat className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <div className="text-xs font-medium text-slate-900 dark:text-slate-200">Repetir Parágrafo 2x (Modo Estudo)</div>
              <div className="text-[10px] text-slate-400">Lê cada parágrafo 2 vezes seguidas para fixação</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.repeatParagraphTwice}
            onChange={(e) => onUpdatePreferences({ repeatParagraphTwice: e.target.checked })}
            className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
          />
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
