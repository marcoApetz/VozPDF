import React, { useState } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  BookOpen, 
  Plus, 
  Play, 
  Sparkles, 
  FileText, 
  X,
  ListPlus,
  Layers,
  ChevronRight,
  GripVertical,
  Check,
  Edit2,
  FolderPlus
} from 'lucide-react';
import { DocumentItem, CollectionItem } from '../types';

interface LibraryModalProps {
  isOpen: boolean;
  documents: DocumentItem[];
  collections: CollectionItem[];
  currentDocId?: string;
  activeCollectionId?: string | null;
  onClose: () => void;
  onSelectDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  onNewDocument: () => void;
  onOpenGoogleDrive: () => void;
  onCreateCollection: (name: string, description?: string) => void;
  onUpdateCollection: (collection: CollectionItem) => void;
  onDeleteCollection: (collectionId: string) => void;
  onPlayCollection: (collection: CollectionItem, startDocIndex?: number) => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  documents,
  collections,
  currentDocId,
  activeCollectionId,
  onClose,
  onSelectDocument,
  onDeleteDocument,
  onNewDocument,
  onOpenGoogleDrive,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onPlayCollection,
}) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'collections'>('docs');
  
  // New Collection Form
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Selected collection detail view
  const [viewingCollectionId, setViewingCollectionId] = useState<string | null>(null);

  // Add document to collection modal / select
  const [showAddDocToCollection, setShowAddDocToCollection] = useState(false);

  if (!isOpen) return null;

  const currentViewingCollection = collections.find(c => c.id === viewingCollectionId) || null;

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateCollection(newFolderName.trim(), newFolderDesc.trim());
    setNewFolderName('');
    setNewFolderDesc('');
    setShowCreateFolder(false);
  };

  const handleToggleDocInCollection = (collection: CollectionItem, docId: string) => {
    const exists = collection.documentIds.includes(docId);
    let updatedDocIds: string[];
    if (exists) {
      updatedDocIds = collection.documentIds.filter(id => id !== docId);
    } else {
      updatedDocIds = [...collection.documentIds, docId];
    }
    onUpdateCollection({
      ...collection,
      documentIds: updatedDocIds,
      updatedAt: Date.now(),
    });
  };

  const handleMoveDocOrder = (collection: CollectionItem, index: number, direction: 'up' | 'down') => {
    const newDocs = [...collection.documentIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newDocs.length) return;

    const temp = newDocs[index];
    newDocs[index] = newDocs[targetIndex];
    newDocs[targetIndex] = temp;

    onUpdateCollection({
      ...collection,
      documentIds: newDocs,
      updatedAt: Date.now(),
    });
  };

  return (
    <div 
      id="library-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Biblioteca & Playlists de Leitura
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Organize pastas de documentos e reproduza todos em sequência contínua
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('docs');
                setViewingCollectionId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'docs'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Todos Documentos ({documents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'collections'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bibliotecas & Playlists ({collections.length})</span>
            </button>
          </div>

          {activeTab === 'docs' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenGoogleDrive();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-medium border border-blue-200 dark:border-blue-800"
              >
                <span>Google Drive</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNewDocument();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Anexar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Nova Biblioteca</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px] max-h-[420px]">
          {/* TAB 1: ALL INDIVIDUAL DOCUMENTS */}
          {activeTab === 'docs' && (
            <>
              {documents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-3 font-light">
                  <BookOpen className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">Nenhum documento salvo na sua biblioteca offline ainda.</p>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onNewDocument();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Anexar PDF / DOCX
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenGoogleDrive();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium"
                    >
                      Google Drive
                    </button>
                  </div>
                </div>
              ) : (
                documents.map((doc) => {
                  const isCurrent = doc.id === currentDocId;
                  const formatBadge = doc.fileType?.toUpperCase() || (doc.fileName?.endsWith('.docx') ? 'DOCX' : 'PDF');

                  return (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-all ${
                        isCurrent
                          ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-400'
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 bg-slate-50/60 dark:bg-slate-800/30'
                      }`}
                    >
                      <div 
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                        onClick={() => {
                          onSelectDocument(doc);
                          onClose();
                        }}
                      >
                        <div className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-medium truncate text-slate-900 dark:text-white">
                              {doc.title}
                            </h4>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                              {formatBadge}
                            </span>
                            {doc.source === 'gdrive' && (
                              <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                Drive
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-600 text-white uppercase">
                                Em Leitura
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-light">
                            <span>{doc.totalPages} {doc.totalPages === 1 ? 'pág' : 'págs'}</span>
                            <span>•</span>
                            <span>{doc.totalWords} palavras</span>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {doc.totalAnomaliesCleaned} repetições limpas
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            onSelectDocument(doc);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
                          title="Abrir este documento"
                        >
                          Abrir
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deseja remover "${doc.title}" da biblioteca offline?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Excluir documento salvo"
                          aria-label="Excluir documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB 2: COLLECTIONS / PLAYLISTS */}
          {activeTab === 'collections' && (
            <>
              {/* Create Folder Box */}
              {showCreateFolder && (
                <form 
                  onSubmit={handleCreateFolderSubmit} 
                  className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FolderPlus className="w-4 h-4 text-blue-500" />
                      <span>Nova Biblioteca / Pasta de Leitura Sequencial</span>
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setShowCreateFolder(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nome da Biblioteca (ex: Artigos de Direito, Livro Capítulo a Capítulo...)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Descrição opcional (ex: Leitura para concurso)"
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800"
                    >
                      Criar Biblioteca
                    </button>
                  </div>
                </form>
              )}

              {/* View single collection inside */}
              {currentViewingCollection ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                    <div>
                      <button
                        onClick={() => setViewingCollectionId(null)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline mb-1 flex items-center gap-1"
                      >
                        ← Voltar para todas as Bibliotecas
                      </button>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {currentViewingCollection.name}
                      </h4>
                      {currentViewingCollection.description && (
                        <p className="text-xs text-slate-500">{currentViewingCollection.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onPlayCollection(currentViewingCollection)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Ler em Sequência</span>
                      </button>
                    </div>
                  </div>

                  {/* Documents in this collection */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
                      <span>Documentos na Fila ({currentViewingCollection.documentIds.length})</span>
                      <span className="text-[10px] font-normal text-slate-400">O app lerá do primeiro ao último automaticamente</span>
                    </div>

                    {currentViewingCollection.documentIds.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-xs">
                        Nenhum documento adicionado a esta biblioteca ainda. Marque os documentos abaixo para incluir na ordem de leitura.
                      </div>
                    ) : (
                      currentViewingCollection.documentIds.map((docId, index) => {
                        const doc = documents.find(d => d.id === docId);
                        if (!doc) return null;

                        return (
                          <div 
                            key={doc.id}
                            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-medium truncate text-slate-900 dark:text-white">
                                  {doc.title}
                                </h5>
                                <span className="text-[10px] text-slate-400">
                                  {doc.totalPages} págs • {doc.totalWords} palavras
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveDocOrder(currentViewingCollection, index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 text-xs"
                                title="Subir ordem"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveDocOrder(currentViewingCollection, index, 'down')}
                                disabled={index === currentViewingCollection.documentIds.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 text-xs"
                                title="Descer ordem"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => handleToggleDocInCollection(currentViewingCollection, doc.id)}
                                className="p-1 text-slate-400 hover:text-red-600 text-xs"
                                title="Remover desta pasta"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add more docs selector */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Adicionar outros documentos a esta biblioteca:
                    </h5>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {documents.map((doc) => {
                        const isIn = currentViewingCollection.documentIds.includes(doc.id);
                        return (
                          <div 
                            key={doc.id}
                            onClick={() => handleToggleDocInCollection(currentViewingCollection, doc.id)}
                            className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-all ${
                              isIn
                                ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{doc.title}</span>
                            {isIn ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <Check className="w-3.5 h-3.5" />
                                <span>Incluído</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">+ Adicionar</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* List all collections */
                <>
                  {collections.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 space-y-3 font-light">
                      <Layers className="w-10 h-10 mx-auto opacity-30" />
                      <p className="text-xs">Nenhuma biblioteca criada ainda. Crie uma pasta para agrupar documentos e ouvi-los em sequência contínua.</p>
                      <button
                        onClick={() => setShowCreateFolder(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Criar Primeira Biblioteca
                      </button>
                    </div>
                  ) : (
                    collections.map((col) => {
                      const isActive = col.id === activeCollectionId;
                      return (
                        <div
                          key={col.id}
                          className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 transition-all ${
                            isActive
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/60 dark:bg-slate-800/30'
                          }`}
                        >
                          <div 
                            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                            onClick={() => setViewingCollectionId(col.id)}
                          >
                            <div className="p-2.5 bg-slate-900 text-white rounded-lg shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {col.name}
                                </h4>
                                {isActive && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-600 text-white uppercase">
                                    Fila Ativa
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {col.documentIds.length} {col.documentIds.length === 1 ? 'documento na sequência' : 'documentos na sequência'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onPlayCollection(col)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs"
                              title="Reproduzir todos em sequência"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Tocar Fila</span>
                            </button>
                            <button
                              onClick={() => setViewingCollectionId(col.id)}
                              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              title="Gerenciar documentos"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Deseja excluir a biblioteca "${col.name}"? Os documentos não serão apagados.`)) {
                                  onDeleteCollection(col.id);
                                }
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Excluir biblioteca"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span className="text-[11px] font-mono">
            {documents.length} documentos • {collections.length} bibliotecas
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
