import { DocumentItem } from '../types';
import { splitIntoSentences, countWords, estimateReadingMinutes, DEFAULT_CLEANING_SETTINGS } from '../utils/textSanitizer';

export function generateSampleDocuments(): DocumentItem[] {
  // Sample 1: Document with obvious repeated characters & OCR anomalies
  const sample1RawPages = [
    `CAPÍTULO I — O DESPERTAR DA LEITURA DIGITAL
Página 1 de 3

Era uma vez um leitor que desejava transformar qualquer texto em voz viva. 
Ele encontrou arquivos com falhas de digitalização, cheios de ruíiiiiiiiidos e caracteres repeti-
dos desnecessariamente pelo scanner.

1. Introdução Teórica .............................................. 05
2. O Problema dos Caracteres Repetidos ............................. 12
3. Solução com Voz Natural e Acessibilidade ........................ 28

Quando o sintetizador de voz tradicional lia as linhas de pontinhos acima, ele passava quase um minuto repetindo: "ponto ponto ponto ponto ponto" sem parar! Isso era insuportaaaaaaavel para os ouvidos.

Com o filtro inteligente ativado, todos esses pontos e repetiçõõõões excessivas são removidos antes da leitura. O som fica suave, límpido e agradável.`,

    `CAPÍTULO II — SÍNTESE DE VOZ OFFLINE E PRIVACIDADE
Página 2 de 3

A grande vantagem de utilizar a tecnologia nativa do navegador é que tudo funciona 100% offline. 
Nenhum dado ou documento confidencial precisa ser enviado para servidores externos.

Formulário de Verificação de Qualidade:
Nome do Usuário: __________________________________________________
Data de Teste: _____ / _____ / 2026

Veja como as quebras de linha com traço são unifi-
cadas automati-
camente sem pausar de forma estranha no meio da palavra. 
Isso garante fluidez absoluta em qualquer velocidade de reprodução!`
  ];

  const pages1 = sample1RawPages.map((rawText, idx) => {
    const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
      rawText,
      idx,
      DEFAULT_CLEANING_SETTINGS
    );
    return {
      pageNumber: idx + 1,
      originalText: rawText,
      cleanedText: pageCleanedText,
      sentences,
      anomalyCount: pageAnomalies.length,
      detectedAnomalies: pageAnomalies,
    };
  });

  const totalWords1 = pages1.reduce((acc, p) => acc + countWords(p.cleanedText), 0);
  const totalAnomalies1 = pages1.reduce((acc, p) => acc + p.anomalyCount, 0);

  const doc1: DocumentItem = {
    id: 'sample-doc-anomalies',
    title: 'Exemplo: Teste de Limpeza de Caracteres Repetidos',
    fileName: 'teste_caracteres_repetidos.pdf',
    fileSizeBytes: 42500,
    fileSizeFormatted: '41.5 KB',
    totalPages: pages1.length,
    pages: pages1,
    createdAt: Date.now() - 3600000 * 2,
    lastReadAt: Date.now() - 3600000 * 2,
    readingProgress: {
      pageIndex: 0,
      sentenceIndex: 0,
      completedPercentage: 0,
    },
    estimatedReadingMinutes: estimateReadingMinutes(totalWords1),
    totalWords: totalWords1,
    totalAnomaliesCleaned: totalAnomalies1,
  };

  // Sample 2: Classical literature sample
  const sample2RawPages = [
    `O PEQUENO PRÍNCIPE — Antoine de Saint-Exupéry
Adaptação em Português para Leitura Acessível

Peço perdão às crianças por dedicar este livro a uma pessoa grande. Tenho uma razão séria para isso: esta pessoa grande é o melhor amigo que tenho no mundo. 

Se todas essas razões não forem suficientes, quero dedicar este livro à criança que essa pessoa grande já foi. Todas as pessoas grandes foram um dia crianças — mas poucas se lembram disso.

As pessoas grandes adoram os números. Quando vocês lhes contam sobre um novo amigo, elas nunca perguntam o essencial. Nunca perguntam: "Qual é o som da sua voz? Quais são os seus jogos favoritos? Ele coleciona borboletas?" Elas perguntam: "Quantos anos ele tem? Quantos irmãos? Quanto ele pesa? Quanto o pai dele ganha?" Somente então acham que o conhecem.`,

    `CAPÍTULO SEGUNDO — O ENCONTRO NO DESERTO

Vivi assim, solitário, sem ninguém com quem pudesse realmente conversar, até uma pane no deserto do Saara, há seis anos. 
Alguma coisa se quebrara no meu motor. 
E como não tinha comigo nem mecânico nem passageiros, preparei-me para tentar resolver sozinho o difícil conserto.

Era para mim uma questão de vida ou morte. 
A água que eu tinha mal dava para oito dias. 
Na primeira noite, adormeci sobre a areia, a mil milhas de qualquer terra habitada. 
Estava mais isolado que um náufrago numa jangada no meio do oceano.

Imaginem então a minha surpresa quando, ao romper do dia, uma vozinha graciosa me acordou, dizendo:
— Por favor... desenha-me um carneiro!`
  ];

  const pages2 = sample2RawPages.map((rawText, idx) => {
    const { sentences, pageCleanedText, pageAnomalies } = splitIntoSentences(
      rawText,
      idx,
      DEFAULT_CLEANING_SETTINGS
    );
    return {
      pageNumber: idx + 1,
      originalText: rawText,
      cleanedText: pageCleanedText,
      sentences,
      anomalyCount: pageAnomalies.length,
      detectedAnomalies: pageAnomalies,
    };
  });

  const totalWords2 = pages2.reduce((acc, p) => acc + countWords(p.cleanedText), 0);
  const totalAnomalies2 = pages2.reduce((acc, p) => acc + p.anomalyCount, 0);

  const doc2: DocumentItem = {
    id: 'sample-doc-principe',
    title: 'O Pequeno Príncipe (Trecho Selecionado)',
    fileName: 'o_pequeno_principe.pdf',
    fileSizeBytes: 68000,
    fileSizeFormatted: '66.4 KB',
    totalPages: pages2.length,
    pages: pages2,
    createdAt: Date.now() - 3600000 * 5,
    lastReadAt: Date.now() - 3600000 * 5,
    readingProgress: {
      pageIndex: 0,
      sentenceIndex: 0,
      completedPercentage: 0,
    },
    estimatedReadingMinutes: estimateReadingMinutes(totalWords2),
    totalWords: totalWords2,
    totalAnomaliesCleaned: totalAnomalies2,
  };

  return [doc1, doc2];
}
