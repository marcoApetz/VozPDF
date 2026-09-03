import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Mic, 
  Moon, 
  Settings2,
  Check,
  Repeat,
  RotateCcw,
  Sparkles,
  User
} from 'lucide-react';
import { VoiceOption, ReaderPreferences, DocumentItem } from '../types';
import { speechEngine } from '../utils/speechEngine';

interface AudioPlayerBarProps {
  isPlaying: boolean;
  isPaused: boolean;
  document: DocumentItem | null;
  currentPageIndex: number;
  currentSentenceIndex: number;
  availableVoices: VoiceOption[];
  preferences: ReaderPreferences;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onPreviousSentence: () => void;
  onNextSentence: () => void;
  onUpdatePreferences: (prefs: Partial<ReaderPreferences>) => void;
  onSeekSentence: (pageIndex: number, sentenceIndex: number) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  isPlaying,
  isPaused,
  document,
  currentPageIndex,
  currentSentenceIndex,
  availableVoices,
  preferences,
  onPlay,
  onPause,
  onResume,
  onStop,
  onPreviousSentence,
  onNextSentence,
  onUpdatePreferences,
  onSeekSentence,
}) => {
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState<number | null>(null);
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'female' | 'pt'>('female');

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerSecondsLeft === null) return;
    if (sleepTimerSecondsLeft <= 0) {
      onPause();
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSecondsLeft, onPause]);

  const handleSetSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    setSleepTimerSecondsLeft(minutes !== null ? minutes * 60 : null);
  };

  const handleRepeatCurrentParagraph = () => {
    speechEngine.repeatCurrentParagraph();
  };

  const currentPage = document?.pages[currentPageIndex];
  const totalSentencesInPage = currentPage?.sentences.length || 1;
  const sentenceProgress = Math.min(100, Math.round(((currentSentenceIndex + 1) / totalSentencesInPage) * 100));

  // Current active voice
  const activeVoice = availableVoices.find((v) => v.voice.voiceURI === preferences.voiceURI) 
    || availableVoices.find((v) => v.isPortuguese && v.gender === 'female')
    || availableVoices.find((v) => v.isPortuguese) 
    || availableVoices[0];

  // Filtered voice options
  const filteredVoices = availableVoices.filter((v) => {
    if (voiceFilter === 'female') return v.gender === 'female' || (v.isPortuguese && v.gender !== 'male');
    if (voiceFilter === 'pt') return v.isPortuguese;
    return true;
  });

  return (
    <div 
      id="audio-player-bar-container"
      className="fixed bottom-0 left-0 right-0 z-40 bg-transparent pointer-events-none"
    >
      <div 
        className={`w-full border-t backdrop-blur-md transition-all duration-200 pointer-events-auto shadow-sm ${
          preferences.theme === 'dark'
            ? 'bg-slate-900/95 border-slate-800 text-slate-100'
            : preferences.theme === 'sepia'
            ? 'bg-[#FAF6ED]/95 border-[#DFD5C3] text-[#3D312A]'
            : preferences.theme === 'contrast'
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          
          {/* Left: Voice Selection with Female Badge & Drawer Toggle */}
          <div className="flex flex-col gap-1 w-full md:w-1/3 items-start">
            <div className="flex items-center justify-between w-full">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <span>Voz</span>
                {activeVoice?.gender === 'female' && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-bold rounded-full">
                    ♀ Feminina
                  </span>
                )}
              </label>

              {/* Study Mode 2x Paragraph indicator */}
              {preferences.repeatParagraphTwice && (
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  Repetir 2x Ativo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full">
              <button
                id="btn-voice-selector"
                onClick={() => setShowVoiceModal(!showVoiceModal)}
                className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
                title="Escolher voz (Feminina / Português)"
              >
                <div className="flex items-center gap-2 truncate">
                  <Mic className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{activeVoice ? activeVoice.name : 'Voz Padrão'}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">▼</span>
              </button>

              <button
                id="btn-audio-settings-drawer"
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showSettingsDrawer 
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
                title="Mais configurações de áudio e estudo"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Main Controls + Repeat Paragraph Buttons */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 sm:gap-5">
              
              {/* Previous Sentence */}
              <button
                id="btn-prev-sentence"
                onClick={onPreviousSentence}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Frase Anterior (Seta Esquerda)"
                aria-label="Frase Anterior"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              {/* Direct Repeat Current Paragraph Button */}
              <button
                id="btn-repeat-current-paragraph-quick"
                onClick={handleRepeatCurrentParagraph}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                title="Ouvir o parágrafo atual novamente desde o início"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline text-[11px]">Repetir Parágrafo</span>
              </button>

              {/* Play / Pause Circular Button */}
              {isPlaying && !isPaused ? (
                <button
                  id="btn-pause-playback"
                  onClick={onPause}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                  title="Pausar Leitura (Espaço)"
                  aria-label="Pausar Leitura"
                >
                  <Pause className="w-5 h-5 fill-current" />
                </button>
              ) : (
                <button
                  id="btn-play-playback"
                  onClick={isPaused ? onResume : onPlay}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                  title="Iniciar Leitura (Espaço)"
                  aria-label="Iniciar Leitura"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>
              )}

              {/* Toggle Automatic 2x Paragraph Repeat Mode */}
              <button
                id="btn-toggle-repeat-twice-player"
                onClick={() => onUpdatePreferences({ repeatParagraphTwice: !preferences.repeatParagraphTwice })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  preferences.repeatParagraphTwice
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
                title="Modo Estudo: Repetir cada parágrafo 2 vezes seguidas"
              >
                <Repeat className={`w-3.5 h-3.5 ${preferences.repeatParagraphTwice ? 'animate-spin-slow' : ''}`} />
                <span>2x</span>
              </button>

              {/* Next Sentence */}
              <button
                id="btn-next-sentence"
                onClick={onNextSentence}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Próxima Frase (Seta Direita)"
                aria-label="Próxima Frase"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              {/* Stop Button */}
              {isPlaying && (
                <button
                  id="btn-stop-playback"
                  onClick={onStop}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  title="Parar Leitura"
                  aria-label="Parar Leitura"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>

            {/* Minimal Slim Progress Bar */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono text-slate-400">
                Frase {currentSentenceIndex + 1}/{totalSentencesInPage}
              </span>
              <div className="w-40 sm:w-56 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 dark:bg-slate-200 rounded-full transition-all duration-200"
                  style={{ width: `${sentenceProgress}%` }}
                />
              </div>
              {sleepTimerSecondsLeft !== null && (
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Moon className="w-2.5 h-2.5" />
                  {Math.floor(sleepTimerSecondsLeft / 60)}:{(sleepTimerSecondsLeft % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          {/* Right: Speed pills */}
          <div className="flex flex-col gap-1 w-full md:w-1/3 items-start md:items-end">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Velocidade da Voz
            </label>
            <div className="flex gap-1">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onUpdatePreferences({ speechRate: rate })}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                    preferences.speechRate === rate
                      ? 'bg-slate-900 border border-slate-900 text-white dark:bg-white dark:text-slate-900 dark:border-white'
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expandable Audio Settings Panel */}
        {showSettingsDrawer && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in slide-in-from-bottom-2 duration-200 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Speed & Pitch Controls */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Tom da Voz (Pitch)</span>
                <span className="font-mono font-bold">{preferences.speechPitch.toFixed(1)}x</span>
              </label>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.1"
                value={preferences.speechPitch}
                onChange={(e) => onUpdatePreferences({ speechPitch: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Repeat Paragraph Toggle */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-blue-500" />
                <span>Repetir Parágrafo (Modo Estudo)</span>
              </label>
              <button
                type="button"
                onClick={() => onUpdatePreferences({ repeatParagraphTwice: !preferences.repeatParagraphTwice })}
                className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-between font-semibold transition-all cursor-pointer ${
                  preferences.repeatParagraphTwice
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <span>Repetir cada parágrafo 2 vezes</span>
                {preferences.repeatParagraphTwice ? <Check className="w-4 h-4 text-white" /> : <span className="text-[10px] text-slate-400">Desativado</span>}
              </button>
            </div>

            {/* Sleep Timer */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5" />
                <span>Temporizador de Sono</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[null, 5, 15, 30, 45].map((min) => (
                  <button
                    key={min ?? 'off'}
                    onClick={() => handleSetSleepTimer(min)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      sleepTimerMinutes === min
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {min === null ? 'Off' : `${min} min`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Voice Selection Dropdown Modal with Female Voice Priority */}
        {showVoiceModal && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto space-y-2 animate-in slide-in-from-bottom-2 duration-200 bg-white dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Selecione a Voz Offline do seu Navegador
                </span>
                <p className="text-[11px] text-slate-500">
                  Priorizamos vozes femininas em português para maior clareza e naturalidade.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVoiceFilter('female')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                    voiceFilter === 'female'
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ♀ Vozes Femininas
                </button>
                <button
                  onClick={() => setVoiceFilter('pt')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                    voiceFilter === 'pt'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🇧🇷 Português
                </button>
                <button
                  onClick={() => setVoiceFilter('all')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                    voiceFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {filteredVoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhuma voz encontrada com este filtro.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredVoices.map((v) => {
                  const isSelected = preferences.voiceURI === v.voice.voiceURI || (!preferences.voiceURI && v.isPortuguese && v.gender === 'female');
                  return (
                    <button
                      key={v.voice.voiceURI}
                      onClick={() => {
                        onUpdatePreferences({ voiceURI: v.voice.voiceURI });
                        setShowVoiceModal(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Mic className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <div className="truncate">
                          <div className="truncate font-medium">{v.name}</div>
                          <div className="text-[10px] opacity-75 font-mono">{v.lang}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {v.gender === 'female' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300'
                          }`}>
                            ♀ Feminina
                          </span>
                        )}
                        {v.gender === 'male' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                          }`}>
                            ♂ Masculina
                          </span>
                        )}
                        {v.isPortuguese && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            PT
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 ml-1 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
