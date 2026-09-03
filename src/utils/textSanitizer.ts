import { CleaningSettings, AnomalyDetail, SentenceData } from '../types';

export const DEFAULT_CLEANING_SETTINGS: CleaningSettings = {
  maxConsecutiveChars: 2,
  cleanDotLeaders: true,
  cleanDuplicatePunctuation: true,
  fixHyphenatedLineBreaks: true,
  removePageNumberArtifacts: true,
  removeRepeatingFormUnderscores: true,
  highlightCleanedInReader: true,
};

/**
 * Sanitizes and cleans text from PDF artifacts and unnecessary repeating characters.
 */
export function sanitizeText(
  rawText: string,
  settings: CleaningSettings = DEFAULT_CLEANING_SETTINGS
): {
  cleanedText: string;
  anomalies: AnomalyDetail[];
} {
  if (!rawText || rawText.trim() === '') {
    return { cleanedText: '', anomalies: [] };
  }

  let text = rawText;
  const anomalies: AnomalyDetail[] = [];
  let anomalyCounter = 0;

  // 1. Fix hyphenated line breaks (e.g. "desenvolvi-\nmento" or "inter- \n nacional")
  if (settings.fixHyphenatedLineBreaks) {
    const hyphenPattern = /([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])-\s*\n\s*([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])/g;
    text = text.replace(hyphenPattern, (match, p1, p2) => {
      anomalies.push({
        id: `anomaly-hyphen-${++anomalyCounter}`,
        type: 'hyphen_break',
        original: match,
        replacement: `${p1}${p2}`,
        count: 1,
        description: `Quebra de linha hifenizada unificada: "${match.replace(/\n/g, '\\n')}" → "${p1}${p2}"`,
      });
      return `${p1}${p2}`;
    });
  }

  // 2. Clean table of contents dot leaders (e.g. "Capítulo 1 ............................ 24")
  if (settings.cleanDotLeaders) {
    // Matches 3 or more dots/periods or dashes/bullet points used as leader lines
    const dotLeaderPattern = /(?:\.|\s\.\s|\s\.\s|\u2022|\-|\–|\—){3,}/g;
    text = text.replace(dotLeaderPattern, (match) => {
      anomalies.push({
        id: `anomaly-dots-${++anomalyCounter}`,
        type: 'dot_leader',
        original: match,
        replacement: ' ',
        count: match.length,
        description: `Linha de pontos/guias removida (${match.length} caracteres repetidos)`,
      });
      return ' ';
    });
  }

  // 3. Clean form fill underscores / lines (e.g. "Assinatura: ___________________________")
  if (settings.removeRepeatingFormUnderscores) {
    const underscorePattern = /_{3,}/g;
    text = text.replace(underscorePattern, (match) => {
      anomalies.push({
        id: `anomaly-under-${++anomalyCounter}`,
        type: 'repeating_char',
        original: match,
        replacement: ' [espaço em branco] ',
        count: match.length,
        description: `Linha de preenchimento (${match.length} traços/sublinhados repetidos)`,
      });
      return ' ';
    });
  }

  // 4. Clean duplicate repeating punctuation (e.g. "!!!!!!", "??????", ",,,,", ";;;;")
  if (settings.cleanDuplicatePunctuation) {
    const punctPattern = /([!?,;:])\1{2,}/g;
    text = text.replace(punctPattern, (match, char) => {
      anomalies.push({
        id: `anomaly-punct-${++anomalyCounter}`,
        type: 'duplicate_punct',
        original: match,
        replacement: char,
        count: match.length,
        description: `Pontuação repetitiva reduzida de "${match}" para "${char}"`,
      });
      return char;
    });
  }

  // 5. Clean unnecessary repeating alphabetic & numeric characters (e.g. "aaaaaaa" -> "aa", "zzzzzz" -> "z", "0000000" -> "00")
  if (settings.maxConsecutiveChars > 0) {
    // Regex for any Unicode character repeated more than maxConsecutiveChars
    // e.g. if max is 2, matches 3 or more identical characters in a row
    const repeatRegex = new RegExp(`([\\p{L}\\p{N}\\p{S}])\\1{${settings.maxConsecutiveChars},}`, 'gu');
    text = text.replace(repeatRegex, (match, char) => {
      const replacement = char.repeat(settings.maxConsecutiveChars);
      anomalies.push({
        id: `anomaly-char-${++anomalyCounter}`,
        type: 'repeating_char',
        original: match,
        replacement,
        count: match.length,
        description: `Caracteres repetidos excessivos (${match.length}x "${char}") simplificados para "${replacement}"`,
      });
      return replacement;
    });
  }

  // 6. Clean repeating whitespace and odd zero-width / control characters
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, ''); // zero-width spaces
  text = text.replace(/[ \t]{2,}/g, ' '); // multiple inline spaces

  // 7. Remove isolated page number patterns if requested
  if (settings.removePageNumberArtifacts) {
    const pageNumRegex = /^\s*(?:p[aá]g(?:ina)?\.?\s*\d+(?:\s*(?:de|\/)\s*\d+)?|\d+\s*(?:de|\/)\s*\d+|\-\s*\d+\s*\-)\s*$/gim;
    text = text.replace(pageNumRegex, (match) => {
      anomalies.push({
        id: `anomaly-pagenum-${++anomalyCounter}`,
        type: 'header_footer',
        original: match,
        replacement: '',
        count: 1,
        description: `Número de página isolado ignorado: "${match.trim()}"`,
      });
      return '';
    });
  }

  // Clean empty lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return {
    cleanedText: text,
    anomalies,
  };
}

/**
 * Splits sanitized text into individual sentences for speech synthesis tracking
 * and interactive reading cursor.
 */
export function splitIntoSentences(
  rawText: string,
  pageIndex: number,
  settings: CleaningSettings = DEFAULT_CLEANING_SETTINGS
): {
  sentences: SentenceData[];
  pageCleanedText: string;
  pageAnomalies: AnomalyDetail[];
} {
  const { cleanedText, anomalies } = sanitizeText(rawText, settings);

  if (!cleanedText) {
    return { sentences: [], pageCleanedText: '', pageAnomalies: [] };
  }

  // Split into paragraphs first by double newline or multiple breaks
  const rawParagraphs = cleanedText.split(/\n\s*\n+/);
  const sentences: SentenceData[] = [];
  let sentenceIdx = 0;

  rawParagraphs.forEach((paragraph, paragraphIdx) => {
    const trimmedP = paragraph.trim();
    if (!trimmedP) return;

    // Split by sentence terminators (. ! ?) while respecting abbreviations
    const protectedP = trimmedP
      .replace(/(?:Dr|Dra|Prof|Profa|Sr|Sra|Eng|Adv|Av|R|Art|Fig|Pág|Cap|Vol|ex|etc)\./gi, (m) => m.replace('.', '§§DOT§§'))
      .replace(/(\d+)\.(\d+)/g, '$1§DOT§$2');

    const rawSegments = protectedP.split(/(?<=[.?!])\s+(?=[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9"«“])|\n+/);

    for (const seg of rawSegments) {
      const restored = seg.replace(/§§DOT§§/g, '.').replace(/§DOT§/g, '.').trim();
      if (restored.length > 0) {
        const sentenceAnomalies = anomalies.filter((a) =>
          restored.toLowerCase().includes(a.replacement.toLowerCase().trim())
        );

        sentences.push({
          id: `sent-p${pageIndex}-s${sentenceIdx}`,
          rawText: restored,
          cleanedText: restored,
          sentenceIndex: sentenceIdx,
          paragraphIndex: paragraphIdx,
          pageIndex,
          anomalies: sentenceAnomalies,
        });
        sentenceIdx++;
      }
    }
  });

  return {
    sentences,
    pageCleanedText: cleanedText,
    pageAnomalies: anomalies,
  };
}

/**
 * Estimate reading time in minutes based on word count.
 * Average reading speed: 150-180 words/min. TTS normal is ~140 words/min.
 */
export function estimateReadingMinutes(wordCount: number, speechRate: number = 1.0): number {
  const baseWordsPerMinute = 150 * speechRate;
  const minutes = Math.ceil(wordCount / baseWordsPerMinute);
  return Math.max(1, minutes);
}

/**
 * Count total words in text
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const matches = text.trim().match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}
