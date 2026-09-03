import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  RotateCcw, 
  Volume2, 
  AlertTriangle, 
  HelpCircle,
  Play
} from 'lucide-react';
import { CleaningSettings } from '../types';
import { sanitizeText } from '../utils/textSanitizer';
import { speechEngine } from '../utils/speechEngine';

interface CleaningSettingsModalProps {
  isOpen: boolean;
  settings: CleaningSettings;
  onClose: () => void;
  onSaveSettings: (settings: CleaningSettings) => void;
  onReapplyCleaning?: () => void;
}

export const CleaningSettingsModal: React.FC<CleaningSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSaveSettings,
  onReapplyCleaning,
}) => {
  const [localSettings, setLocalSettings] = useState<CleaningSettings>(settings);
  const [sandboxText, setSandboxText] = useState(
    'Oláaaaaaa amigos....... Sejam bem-vindos ao sistema de lei-\ntura em voz alta com ruíiiiidos e pontuações excessivas!!!!!'
  );

  if (!isOpen) return null;

  const { cleanedText: testCleaned, anomalies: testAnomalies } = sanitizeText(sandboxText, localSettings);

  const handleTestAudio = (textToSpeak: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onReapplyCleaning?.();
    onClose();
  };

  return (
    <div 
      id="cleaning-settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-slate-900 dark:text-slate-100 p-6 sm:p-8 space-y-6"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">Filtro de Caracteres Repetidos</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Evita repetição mecânica de pontos de sumário e caracteres repetidos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rule Switches */}
        <div className="space-y-3">
          {/* Max Consecutive Characters */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-slate-900 dark:text-slate-200">
                  Limite Máximo de Letras Iguais Consecutivas
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Exemplo: "socoooorro" será simplificado para no máximo {localSettings.maxConsecutiveChars} caracteres.
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-200 px-2 py-0.5 rounded">
                {localSettings.maxConsecutiveChars} max
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={localSettings.maxConsecutiveChars}
              onChange={(e) => setLocalSettings({ ...localSettings, maxConsecutiveChars: parseInt(e.target.value, 10) })}
              className="w-full accent-slate-900 dark:accent-slate-100 cursor-pointer"
            />
          </div>

          {/* Dot Leaders (Table of contents) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="pr-4">
              <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Limpar Linhas Pontilhadas de Sumários</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-light">
                Remove sequências como "..............." ou "------------" de sumários de PDFs.
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.cleanDotLeaders}
              onChange={(e) => setLocalSettings({ ...localSettings, cleanDotLeaders: e.target.checked })}
              className="w-4 h-4 accent-slate-900 cursor-pointer rounded"
            />
          </div>

          {/* Duplicate Punctuation */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="pr-4">
              <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Reduzir Pontuações Múltiplas</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-light">
                Transforma "!!!!", "????", ",,,," em apenas uma pontuação limpa.
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.cleanDuplicatePunctuation}
              onChange={(e) => setLocalSettings({ ...localSettings, cleanDuplicatePunctuation: e.target.checked })}
              className="w-4 h-4 accent-slate-900 cursor-pointer rounded"
            />
          </div>

          {/* Hyphenated Line Breaks */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="pr-4">
              <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Unificar Quebras de Linha com Hífen</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-light">
                Une palavras partidas no fim de linha (ex: "desenvolvi- \n mento" → "desenvolvimento").
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.fixHyphenatedLineBreaks}
              onChange={(e) => setLocalSettings({ ...localSettings, fixHyphenatedLineBreaks: e.target.checked })}
              className="w-4 h-4 accent-slate-900 cursor-pointer rounded"
            />
          </div>

          {/* Form Blank Underscores */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="pr-4">
              <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Remover Linhas de Formulário ("________")</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-light">
                Ignora linhas vazias de formulários ou assinaturas para leitura fluida.
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.removeRepeatingFormUnderscores}
              onChange={(e) => setLocalSettings({ ...localSettings, removeRepeatingFormUnderscores: e.target.checked })}
              className="w-4 h-4 accent-slate-900 cursor-pointer rounded"
            />
          </div>
        </div>

        {/* Live Interactive Sandbox Tester */}
        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Simulador em Tempo Real</span>
            </span>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              {testAnomalies.length} repetições detectadas
            </span>
          </div>

          <textarea
            rows={2}
            value={sandboxText}
            onChange={(e) => setSandboxText(e.target.value)}
            placeholder="Digite qualquer texto com repetições para testar..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none font-mono"
          />

          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium space-y-2">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Resultado Sanitizado para a Voz:
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-light">
              "{testCleaned}"
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleTestAudio(testCleaned)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Ouvir Texto Limpo</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestAudio(sandboxText)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium"
                title="Ouvir com todos os ruídos para comparar"
              >
                <span>Ouvir com Ruídos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setLocalSettings(settings)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-light"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              id="btn-save-cleaning-settings"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar e Aplicar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
