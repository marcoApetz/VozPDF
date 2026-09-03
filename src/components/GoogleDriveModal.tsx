import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Search, 
  RefreshCw, 
  FileText, 
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  X, 
  Loader2, 
  Download, 
  ShieldCheck,
  AlertCircle,
  LogOut,
  User as UserIcon,
  ArrowLeft,
  Filter,
  Globe,
  Plus
} from 'lucide-react';
import { GDriveFileItem, CleaningSettings, DocumentItem } from '../types';
import { 
  listGoogleDriveFiles, 
  importGoogleDriveFile, 
  isGoogleAuthenticated,
  googleSignIn,
  googleSignOut,
  getCurrentUser
} from '../utils/googleDriveService';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentImported: (doc: DocumentItem) => void;
  cleaningSettings: CleaningSettings;
}

interface FolderBreadcrumb {
  id: string;
  name: string;
}

type FilterType = 'all' | 'folders' | 'pdf' | 'docs' | 'word' | 'txt';

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onDocumentImported,
  cleaningSettings,
}) => {
  const [files, setFiles] = useState<GDriveFileItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewScope, setViewScope] = useState<'folders' | 'all_drive'>('folders');
  const [currentFolder, setCurrentFolder] = useState<FolderBreadcrumb>({ id: 'root', name: 'Meu Drive' });
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([{ id: 'root', name: 'Meu Drive' }]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAuth, setHasAuth] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const authOk = isGoogleAuthenticated();
      setHasAuth(authOk);
      const u = getCurrentUser();
      setUserEmail(u?.email || null);
      if (authOk) {
        loadFiles('', currentFolder.id, activeFilter, undefined, false);
      }
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      setHasAuth(true);
      setUserEmail(result.user.email);
      await loadFiles('', 'root', activeFilter, undefined, false);
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('A janela de autorização foi fechada antes de concluir.');
      } else {
        setErrorMessage(err.message || 'Falha ao conectar com sua conta Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setHasAuth(false);
    setUserEmail(null);
    setFiles([]);
    setNextPageToken(undefined);
    setBreadcrumbs([{ id: 'root', name: 'Meu Drive' }]);
    setCurrentFolder({ id: 'root', name: 'Meu Drive' });
  };

  const loadFiles = async (
    query = searchQuery, 
    folderId = currentFolder.id, 
    filter = activeFilter, 
    pageToken?: string,
    append = false
  ) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const targetFolder = viewScope === 'all_drive' || query.trim() ? 'all_drive' : folderId;
      const res = await listGoogleDriveFiles(query, targetFolder, filter, pageToken, 60);
      
      if (append) {
        setFiles((prev) => [...prev, ...res.files]);
      } else {
        setFiles(res.files);
      }
      setNextPageToken(res.nextPageToken);
      setHasAuth(true);
      const u = getCurrentUser();
      if (u) setUserEmail(u.email);
    } catch (err: any) {
      console.warn('Erro ao carregar Google Drive:', err);
      if (err.message && err.message.includes('popup-closed-by-user')) {
        setErrorMessage('Janela fechada pelo usuário.');
      } else {
        setErrorMessage(err.message || 'Não foi possível carregar os arquivos do Google Drive.');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleOpenFolder = (folder: GDriveFileItem) => {
    setViewScope('folders');
    const newBreadcrumb: FolderBreadcrumb = { id: folder.id, name: folder.name };
    const updated = [...breadcrumbs, newBreadcrumb];
    setBreadcrumbs(updated);
    setCurrentFolder(newBreadcrumb);
    setSearchQuery('');
    loadFiles('', folder.id, activeFilter, undefined, false);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    setViewScope('folders');
    const target = breadcrumbs[index];
    const updated = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(updated);
    setCurrentFolder(target);
    setSearchQuery('');
    loadFiles('', target.id, activeFilter, undefined, false);
  };

  const handleGoBack = () => {
    if (breadcrumbs.length > 1) {
      handleNavigateBreadcrumb(breadcrumbs.length - 2);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAuth) {
      handleSignIn();
      return;
    }
    loadFiles(searchQuery, currentFolder.id, activeFilter, undefined, false);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    loadFiles(searchQuery, currentFolder.id, filter, undefined, false);
  };

  const handleToggleScope = (scope: 'folders' | 'all_drive') => {
    setViewScope(scope);
    if (scope === 'all_drive') {
      loadFiles(searchQuery, 'all_drive', activeFilter, undefined, false);
    } else {
      loadFiles(searchQuery, currentFolder.id, activeFilter, undefined, false);
    }
  };

  const handleLoadMore = () => {
    if (!nextPageToken || isLoadingMore) return;
    loadFiles(searchQuery, currentFolder.id, activeFilter, nextPageToken, true);
  };

  const handleImport = async (file: GDriveFileItem) => {
    setIsImporting(file.id);
    setImportStatus('Iniciando importação...');
    try {
      const doc = await importGoogleDriveFile(
        file,
        cleaningSettings,
        (_progress, status) => setImportStatus(status)
      );
      onDocumentImported(doc);
      onClose();
    } catch (err: any) {
      console.error('Falha na importação:', err);
      alert(`Falha ao importar documento: ${err.message || 'Erro de conexão'}`);
    } finally {
      setIsImporting(null);
      setImportStatus('');
    }
  };

  const getFileBadge = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">Pasta</span>;
    }
    if (mimeType === 'application/pdf') {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">PDF</span>;
    }
    if (mimeType === 'application/vnd.google-apps.document') {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Google Docs</span>;
    }
    if (mimeType.includes('word') || mimeType.includes('officedocument') || mimeType.includes('msword')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">DOCX / Word</span>;
    }
    if (mimeType.includes('epub')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">EPUB</span>;
    }
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Texto / TXT</span>;
  };

  if (!isOpen) return null;

  return (
    <div 
      id="modal-google-drive"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 p-4 sm:p-6 space-y-3 sm:space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Google Drive Completo</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Acesso Seguro</span>
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Navegue pelas pastas, discos compartilhados ou pesquise todos os seus PDFs, Docs e Word
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth status bar */}
        {hasAuth && userEmail && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 truncate">
              <UserIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Conectado como <strong>{userEmail}</strong></span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-semibold ml-2 shrink-0 cursor-pointer"
              title="Desconectar conta Google"
            >
              <LogOut className="w-3 h-3" />
              <span>Desconectar</span>
            </button>
          </div>
        )}

        {/* If not authenticated, show friendly sign-in prompt */}
        {!hasAuth ? (
          <div className="py-12 px-4 text-center space-y-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-850/50">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
              <Cloud className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Conectar ao Google Drive
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesse todos os seus arquivos, pastas e discos compartilhados com suporte total a PDFs, Google Docs, Word (DOCX) e arquivos de texto.
              </p>
            </div>

            {errorMessage && (
              <div className="max-w-md mx-auto p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <button
                id="btn-google-drive-signin"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Conectando com o Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>Fazer login com o Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search + Scope Mode + Refresh Bar */}
            <div className="space-y-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar qualquer arquivo ou pasta em todo o seu Google Drive..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        loadFiles('', currentFolder.id, activeFilter, undefined, false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadFiles(searchQuery, currentFolder.id, activeFilter, undefined, false)}
                  disabled={isLoading}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </form>

              {/* View Scope (Por Pastas vs Todo o Drive) & Type Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleToggleScope('folders')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      viewScope === 'folders' && !searchQuery
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Navegar por Pastas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleScope('all_drive')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      viewScope === 'all_drive' || searchQuery
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Todo o Google Drive</span>
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mr-1">
                    <Filter className="w-3 h-3" />
                    Filtro:
                  </span>
                  {(['all', 'folders', 'pdf', 'docs', 'word', 'txt'] as FilterType[]).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => handleFilterChange(ft)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        activeFilter === ft
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {ft === 'all' && 'Todos'}
                      {ft === 'folders' && '📁 Pastas'}
                      {ft === 'pdf' && '📕 PDFs'}
                      {ft === 'docs' && '📘 Docs'}
                      {ft === 'word' && '📄 Word'}
                      {ft === 'txt' && '📝 TXT'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Folder Breadcrumb Navigation (when in folder mode) */}
            {viewScope === 'folders' && !searchQuery && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs overflow-x-auto">
                {breadcrumbs.length > 1 && (
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="p-1 mr-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="Voltar para a pasta anterior"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id + idx}>
                      <button
                        type="button"
                        onClick={() => handleNavigateBreadcrumb(idx)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors truncate max-w-[180px] cursor-pointer ${
                          isLast
                            ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {idx === 0 ? <Home className="w-3.5 h-3.5 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{crumb.name}</span>
                      </button>
                      {!isLast && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Error or Notice */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => handleSignIn()}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    Reconectar ao Google Drive
                  </button>
                </div>
              </div>
            )}

            {/* File & Folder List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px] max-h-[380px]">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs">Buscando todos os arquivos e pastas do Google Drive...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-3 font-light">
                  <FolderOpen className="w-12 h-12 mx-auto opacity-30 text-slate-500" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Nenhum documento encontrado nesta exibição.
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Tente clicar em <strong>"Todo o Google Drive"</strong> no topo, ou digite o nome do arquivo na barra de busca.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleToggleScope('all_drive')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Buscar em Todo o Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => loadFiles('', currentFolder.id, 'all', undefined, false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Recarregar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {files.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const isCurrentImport = isImporting === file.id;

                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (isFolder) {
                            handleOpenFolder(file);
                          }
                        }}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          isFolder
                            ? 'border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 cursor-pointer shadow-2xs'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 bg-white dark:bg-slate-850 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-2.5 rounded-xl border shadow-2xs shrink-0 ${
                            isFolder 
                              ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {isFolder ? <Folder className="w-5 h-5 fill-current" /> : <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-xs truncate ${isFolder ? 'font-bold text-amber-950 dark:text-amber-200' : 'font-semibold text-slate-900 dark:text-white'}`}>
                                {file.name}
                              </h4>
                              {getFileBadge(file.mimeType)}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              {isFolder ? (
                                <span className="text-amber-700 dark:text-amber-400 font-medium">Clique para abrir pasta</span>
                              ) : (
                                <>
                                  {file.size && (
                                    <span>{(parseInt(file.size, 10) / (1024 * 1024)).toFixed(1)} MB</span>
                                  )}
                                  {file.modifiedTime && (
                                    <span>• Modificado em {new Date(file.modifiedTime).toLocaleDateString('pt-BR')}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFolder(file);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 text-xs font-bold cursor-pointer shadow-2xs transition-colors"
                            >
                              <span>Abrir Pasta</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleImport(file)}
                              disabled={isImporting !== null}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                              {isCurrentImport ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span className="text-[11px]">{importStatus || 'Baixando...'}</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Ouvir com Voz</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Load More Button if nextPageToken exists */}
                  {nextPageToken && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Carregando mais arquivos...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Carregar Mais Arquivos</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span className="text-[11px] font-mono">
            {files.length} {files.length === 1 ? 'item exibido' : 'itens exibidos'} {nextPageToken ? '(mais disponíveis)' : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-xs cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
