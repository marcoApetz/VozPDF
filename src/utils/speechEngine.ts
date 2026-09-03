import { Capacitor } from '@capacitor/core';
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech';
import { VoiceOption, PageData } from '../types';

export interface SpeechEngineCallbacks {
  onSentenceStart?: (pageIndex: number, sentenceIndex: number) => void;
  onWordBoundary?: (charIndex: number, charLength?: number) => void;
  onSentenceEnd?: (pageIndex: number, sentenceIndex: number) => void;
  onPageEnd?: (pageIndex: number) => void;
  onDocEnd?: () => void;
  onStateChange?: (isPlaying: boolean, isPaused: boolean) => void;
  onError?: (error: string) => void;
}

export class SpeechEngine {
  // On Android (packaged as a native app via Capacitor), the WebView's Web Speech
  // API is unreliable once the screen locks or the app loses focus. We use the
  // device's native TextToSpeech engine instead in that case; the browser
  // (window.speechSynthesis) path below stays untouched for the web app.
  private readonly isNative = Capacitor.isNativePlatform();
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;
  private isPaused = false;
  private heartbeatInterval: number | null = null;

  // Native TTS state
  private nativeVoices: SpeechSynthesisVoice[] = [];
  private nativeVoicesReady: Promise<void> = Promise.resolve();
  // Bumped on every stop/pause/new-sentence so a stale `speak()` completion
  // (native TTS has no real pause, only stop) can't advance the reader.
  private speakToken = 0;

  // Active state
  private pages: PageData[] = [];
  private currentPageIndex = 0;
  private currentSentenceIndex = 0;
  private callbacks: SpeechEngineCallbacks = {};

  // Settings
  private rate = 1.0;
  private pitch = 1.0;
  private volume = 1.0;
  private selectedVoiceURI = '';
  private availableVoices: SpeechSynthesisVoice[] = [];
  private continuousPageRead = true;
  private repeatParagraphTwice = false;
  private repeatParagraphCount = 2;
  private paragraphRepeatIteration = 0; // 0 = first pass, 1 = 2nd pass

  constructor() {
    if (this.isNative) {
      this.nativeVoicesReady = this.loadNativeVoices();
      TextToSpeech.addListener('onRangeStart', (info) => {
        if (this.isPlaying && !this.isPaused) {
          this.callbacks.onWordBoundary?.(info.start, info.end - info.start);
        }
      });
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();

      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private async loadNativeVoices(): Promise<void> {
    try {
      const { voices } = await TextToSpeech.getSupportedVoices();
      this.nativeVoices = voices;
    } catch (e) {
      console.warn('Não foi possível carregar as vozes nativas:', e);
    }
  }

  public isSupported(): boolean {
    return this.isNative || this.synth !== null;
  }

  /** Resolves once the voice list is available (native voices load asynchronously). */
  public async waitForVoices(): Promise<void> {
    if (this.isNative) await this.nativeVoicesReady;
  }

  public setCallbacks(callbacks: SpeechEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public setConfig(options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceURI?: string;
    continuousPageRead?: boolean;
    repeatParagraphTwice?: boolean;
    repeatParagraphCount?: number;
  }) {
    if (options.rate !== undefined) this.rate = Math.max(0.5, Math.min(2.5, options.rate));
    if (options.pitch !== undefined) this.pitch = Math.max(0.5, Math.min(1.5, options.pitch));
    if (options.volume !== undefined) this.volume = Math.max(0, Math.min(1, options.volume));
    if (options.voiceURI !== undefined) this.selectedVoiceURI = options.voiceURI;
    if (options.continuousPageRead !== undefined) this.continuousPageRead = options.continuousPageRead;
    if (options.repeatParagraphTwice !== undefined) this.repeatParagraphTwice = options.repeatParagraphTwice;
    if (options.repeatParagraphCount !== undefined) this.repeatParagraphCount = options.repeatParagraphCount;

    // If currently speaking and rate/pitch changed, restart current sentence
    if (this.isPlaying && !this.isPaused && (options.rate !== undefined || options.pitch !== undefined || options.voiceURI !== undefined)) {
      this.speakCurrentSentence();
    }
  }

  public detectGender(name: string, uri: string): 'female' | 'male' | 'unknown' {
    const n = `${name} ${uri}`.toLowerCase();
    if (
      n.includes('female') ||
      n.includes('feminina') ||
      n.includes('mulher') ||
      n.includes('luciana') ||
      n.includes('francisca') ||
      n.includes('maria') ||
      n.includes('joana') ||
      n.includes('heloisa') ||
      n.includes('leticia') ||
      n.includes('helena') ||
      n.includes('victoria') ||
      n.includes('vitória') ||
      n.includes('zira') ||
      n.includes('samantha') ||
      n.includes('karen') ||
      n.includes('sara') ||
      n.includes('monica') ||
      n.includes('mônica') ||
      n.includes('yara') ||
      n.includes('camila') ||
      n.includes('fernanda') ||
      n.includes('raquel') ||
      n.includes('ines') ||
      n.includes('inês')
    ) {
      return 'female';
    }
    if (
      n.includes('male') ||
      n.includes('masculina') ||
      n.includes('felipe') ||
      n.includes('ricardo') ||
      n.includes('daniel') ||
      n.includes('david') ||
      n.includes('george') ||
      n.includes('antonio') ||
      n.includes('antónio') ||
      n.includes('manuel') ||
      n.includes('gabriel')
    ) {
      return 'male';
    }
    return 'unknown';
  }

  public getVoices(): VoiceOption[] {
    const voices = this.isNative ? this.nativeVoices : this.synth?.getVoices() ?? [];
    if (!this.isNative) this.availableVoices = voices;
    if (voices.length === 0) return [];

    return voices.map((v) => {
      const isPortuguese = v.lang.toLowerCase().startsWith('pt');
      const gender = this.detectGender(v.name, v.voiceURI);
      return {
        voice: v,
        name: v.name,
        lang: v.lang,
        gender,
        isPortuguese,
        isDefault: v.default,
      };
    }).sort((a, b) => {
      // 1. Portuguese female voices first
      if (a.isPortuguese && b.isPortuguese) {
        if (a.gender === 'female' && b.gender !== 'female') return -1;
        if (a.gender !== 'female' && b.gender === 'female') return 1;
      }
      // 2. Portuguese voices before other languages
      if (a.isPortuguese && !b.isPortuguese) return -1;
      if (!a.isPortuguese && b.isPortuguese) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private loadVoices() {
    if (!this.synth) return;
    this.availableVoices = this.synth.getVoices();
  }

  public setDocument(pages: PageData[], initialPageIndex = 0, initialSentenceIndex = 0) {
    this.stop();
    this.pages = pages;
    this.currentPageIndex = Math.max(0, Math.min(pages.length - 1, initialPageIndex));
    this.currentSentenceIndex = Math.max(0, initialSentenceIndex);
    this.paragraphRepeatIteration = 0;
  }

  public play(pageIndex?: number, sentenceIndex?: number) {
    if (!this.isSupported() || this.pages.length === 0) return;

    if (pageIndex !== undefined) {
      this.currentPageIndex = Math.max(0, Math.min(this.pages.length - 1, pageIndex));
    }
    if (sentenceIndex !== undefined) {
      this.currentSentenceIndex = Math.max(0, sentenceIndex);
      this.paragraphRepeatIteration = 0;
    }

    if (this.isPaused) {
      this.resume();
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.notifyState();
    this.startHeartbeat();
    this.speakCurrentSentence();
  }

  public pause() {
    if (!this.isPlaying) return;
    if (this.isNative) {
      this.speakToken++; // invalidate the in-flight speak() completion
      TextToSpeech.stop();
    } else {
      this.synth?.pause();
    }
    this.isPaused = true;
    this.notifyState();
  }

  public resume() {
    if (!this.isSupported()) return;
    if (this.isPaused && this.isNative) {
      // Native TTS has no real resume: replay the current sentence from its start.
      this.isPaused = false;
      this.isPlaying = true;
      this.notifyState();
      this.speakCurrentSentence();
    } else if (this.isPaused) {
      this.synth?.resume();
      this.isPaused = false;
      this.isPlaying = true;
      this.notifyState();
    } else {
      this.play(this.currentPageIndex, this.currentSentenceIndex);
    }
  }

  public stop() {
    if (!this.isSupported()) return;
    this.speakToken++; // invalidate the in-flight speak() completion
    this.stopHeartbeat();
    if (this.isNative) {
      TextToSpeech.stop();
    } else {
      this.synth?.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.paragraphRepeatIteration = 0;
    this.notifyState();
  }

  /**
   * Helper to find the sentence range for the current paragraph
   */
  private getParagraphRange(page: PageData, sentIdx: number): { start: number; end: number } {
    if (!page || !page.sentences || page.sentences.length === 0) {
      return { start: 0, end: 0 };
    }
    const targetSentence = page.sentences[sentIdx];
    const targetParagraphIndex = targetSentence?.paragraphIndex ?? 0;

    let start = sentIdx;
    while (start > 0 && (page.sentences[start - 1]?.paragraphIndex ?? 0) === targetParagraphIndex) {
      start--;
    }

    let end = sentIdx;
    while (end < page.sentences.length - 1 && (page.sentences[end + 1]?.paragraphIndex ?? 0) === targetParagraphIndex) {
      end++;
    }

    return { start, end };
  }

  /**
   * Directly repeats the current paragraph from its first sentence
   */
  public repeatCurrentParagraph() {
    const page = this.pages[this.currentPageIndex];
    if (!page) return;
    const { start } = this.getParagraphRange(page, this.currentSentenceIndex);
    this.currentSentenceIndex = start;
    this.paragraphRepeatIteration = 0;
    if (this.isPlaying) {
      this.speakCurrentSentence();
    } else {
      this.play(this.currentPageIndex, start);
    }
  }

  /**
   * Repeats a specific paragraph by sentence index or paragraph index
   */
  public repeatParagraph(pageIndex: number, sentenceIndex: number) {
    this.currentPageIndex = Math.max(0, Math.min(this.pages.length - 1, pageIndex));
    const page = this.pages[this.currentPageIndex];
    if (!page) return;
    const { start } = this.getParagraphRange(page, sentenceIndex);
    this.currentSentenceIndex = start;
    this.paragraphRepeatIteration = 0;
    this.play(this.currentPageIndex, start);
  }

  public nextSentence() {
    const page = this.pages[this.currentPageIndex];
    if (!page) return;

    // Check if repeatParagraphTwice is active and if we are at paragraph boundary
    if (this.repeatParagraphTwice) {
      const { start, end } = this.getParagraphRange(page, this.currentSentenceIndex);
      if (this.currentSentenceIndex >= end) {
        // We reached the end of the current paragraph
        if (this.paragraphRepeatIteration === 0) {
          // Loop back to start of this paragraph for the 2nd repetition!
          this.paragraphRepeatIteration = 1;
          this.currentSentenceIndex = start;
          if (this.isPlaying) {
            this.speakCurrentSentence();
          } else {
            this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);
          }
          return;
        } else {
          // Completed 2nd repetition, reset iteration and proceed to next paragraph
          this.paragraphRepeatIteration = 0;
        }
      }
    }

    if (this.currentSentenceIndex < page.sentences.length - 1) {
      this.currentSentenceIndex++;
      if (this.isPlaying) {
        this.speakCurrentSentence();
      } else {
        this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);
      }
    } else if (this.currentPageIndex < this.pages.length - 1) {
      // Go to next page
      this.currentPageIndex++;
      this.currentSentenceIndex = 0;
      this.paragraphRepeatIteration = 0;
      if (this.isPlaying) {
        this.speakCurrentSentence();
      } else {
        this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);
      }
    } else {
      // End of document
      this.stop();
      this.callbacks.onDocEnd?.();
    }
  }

  public previousSentence() {
    this.paragraphRepeatIteration = 0;
    if (this.currentSentenceIndex > 0) {
      this.currentSentenceIndex--;
      if (this.isPlaying) {
        this.speakCurrentSentence();
      } else {
        this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);
      }
    } else if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
      const prevPage = this.pages[this.currentPageIndex];
      this.currentSentenceIndex = prevPage ? Math.max(0, prevPage.sentences.length - 1) : 0;
      if (this.isPlaying) {
        this.speakCurrentSentence();
      } else {
        this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);
      }
    }
  }

  public jumpTo(pageIndex: number, sentenceIndex: number = 0) {
    this.currentPageIndex = Math.max(0, Math.min(this.pages.length - 1, pageIndex));
    const page = this.pages[this.currentPageIndex];
    this.currentSentenceIndex = page ? Math.max(0, Math.min(page.sentences.length - 1, sentenceIndex)) : 0;
    this.paragraphRepeatIteration = 0;

    if (this.isPlaying) {
      this.speakCurrentSentence();
    } else {
      this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);
    }
  }

  private speakCurrentSentence() {
    if (!this.isSupported()) return;

    // Cancel any ongoing utterance
    if (this.isNative) {
      this.speakToken++;
      TextToSpeech.stop();
    } else {
      this.synth?.cancel();
    }

    const page = this.pages[this.currentPageIndex];
    if (!page || page.sentences.length === 0) {
      // Empty page, skip to next page if continuous
      if (this.continuousPageRead && this.currentPageIndex < this.pages.length - 1) {
        this.currentPageIndex++;
        this.currentSentenceIndex = 0;
        this.paragraphRepeatIteration = 0;
        this.speakCurrentSentence();
      } else {
        this.stop();
      }
      return;
    }

    if (this.currentSentenceIndex >= page.sentences.length) {
      // Page completed
      this.callbacks.onPageEnd?.(this.currentPageIndex);
      if (this.continuousPageRead && this.currentPageIndex < this.pages.length - 1) {
        this.currentPageIndex++;
        this.currentSentenceIndex = 0;
        this.paragraphRepeatIteration = 0;
        this.speakCurrentSentence();
      } else {
        this.stop();
        this.callbacks.onDocEnd?.();
      }
      return;
    }

    const sentence = page.sentences[this.currentSentenceIndex];
    const textToSpeak = sentence.cleanedText || sentence.rawText;

    if (!textToSpeak || textToSpeak.trim() === '') {
      // Empty sentence, move to next
      this.nextSentence();
      return;
    }

    if (this.isNative) {
      this.speakNative(textToSpeak);
    } else {
      this.speakWeb(textToSpeak);
    }
  }

  private findVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
    // Apply voice: prioritize female Portuguese voice
    if (this.selectedVoiceURI) {
      const selected =
        voices.find((v) => v.voiceURI === this.selectedVoiceURI) ??
        voices.find((v) => v.name === this.selectedVoiceURI);
      if (selected) return selected;
    }

    const ptVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));
    const femalePt = ptVoices.find((v) => this.detectGender(v.name, v.voiceURI) === 'female');
    const anyPt = femalePt || ptVoices.find((v) => this.detectGender(v.name, v.voiceURI) !== 'male') || ptVoices[0];
    if (anyPt) return anyPt;

    return voices.find((v) => this.detectGender(v.name, v.voiceURI) === 'female');
  }

  private speakWeb(textToSpeak: string) {
    if (!this.synth) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    this.currentUtterance = utterance;

    const voice = this.findVoice(this.availableVoices);
    if (voice) utterance.voice = voice;

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    utterance.onstart = () => {
      this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        this.callbacks.onWordBoundary?.(event.charIndex, event.charLength);
      }
    };

    utterance.onend = () => {
      this.callbacks.onSentenceEnd?.(this.currentPageIndex, this.currentSentenceIndex);
      if (this.isPlaying && !this.isPaused) {
        this.nextSentence();
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.warn('Speech synthesis utterance error:', event);
        this.callbacks.onError?.(`Erro na leitura: ${event.error}`);
      }
    };

    this.synth.speak(utterance);
  }

  private async speakNative(textToSpeak: string) {
    await this.nativeVoicesReady;

    const token = ++this.speakToken;
    const voice = this.findVoice(this.nativeVoices);
    const voiceIndex = voice ? this.nativeVoices.indexOf(voice) : undefined;

    this.callbacks.onSentenceStart?.(this.currentPageIndex, this.currentSentenceIndex);

    try {
      await TextToSpeech.speak({
        text: textToSpeak,
        lang: voice?.lang || 'pt-BR',
        rate: this.rate,
        pitch: this.pitch,
        volume: this.volume,
        voice: voiceIndex,
        category: 'playback',
        queueStrategy: QueueStrategy.Flush,
      });
    } catch (e) {
      if (token === this.speakToken) {
        console.warn('Native TTS error:', e);
        this.callbacks.onError?.('Erro na leitura de voz');
      }
      return;
    }

    // A stale token means this sentence was stopped/paused or superseded before it finished.
    if (token !== this.speakToken) return;

    this.callbacks.onSentenceEnd?.(this.currentPageIndex, this.currentSentenceIndex);
    if (this.isPlaying && !this.isPaused) {
      this.nextSentence();
    }
  }

  // Prevent Chrome from sleeping during long TTS (not needed on native Android TTS)
  private startHeartbeat() {
    if (this.isNative) return;
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.synth && this.isPlaying && !this.isPaused && this.synth.speaking) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 12000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private notifyState() {
    this.callbacks.onStateChange?.(this.isPlaying, this.isPaused);
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentPageIndex: this.currentPageIndex,
      currentSentenceIndex: this.currentSentenceIndex,
    };
  }
}

// Export singleton instance for app-wide use
export const speechEngine = new SpeechEngine();
