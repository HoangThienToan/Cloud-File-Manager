import React from "react";
import { Item } from "./types";
import Breadcrumb from "./Breadcrumb";
import { useLanguage } from "@/contexts/LanguageContext";
// import FileTableNew from "./FileTableNew";
import FolderTreeNode from "./FolderTreeNode";

interface FileManagerLayoutProps {
  renderContextMenu?: () => React.ReactNode;
  folderTree: any[];
  currentFolder: string | null;
  setCurrentFolder: (id: string | null) => void;
  creatingFolder: boolean;
  setCreatingFolder: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  items: Item[];
  setError: (v: string) => void;
  fetchItems: (parentId?: string | null) => void;
  enableMultiSelect: boolean;
  setEnableMultiSelect: (v: boolean) => void;
  dragSelecting: boolean;
  setDragSelecting: (v: boolean) => void;
  dragStart: { x: number, y: number } | null;
  setDragStart: (v: { x: number, y: number } | null) => void;
  dragEnd: { x: number, y: number } | null;
  setDragEnd: (v: { x: number, y: number } | null) => void;
  dragBoxRef: React.RefObject<HTMLDivElement | null>;
  loading: boolean;
  error: string;
  uploading: boolean;
  handleUpload: (e: React.FormEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileTitleRef: React.RefObject<HTMLHeadingElement | null>;
  selectedItems: string[];
  setSelectedItems: (v: string[]) => void;
  isSelected: (id: string) => boolean;
  handleSelect: (id: string, e: React.MouseEvent | React.ChangeEvent) => void;
  handleSelectAll: (checked: boolean) => void;
  renaming: { id: string; type: 'file' | 'folder'; name: string } | null;
  setRenaming: (v: { id: string; type: 'file' | 'folder'; name: string } | null) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  handleDelete: (id: string) => void;
  setContextMenu: (v: any) => void;
}

const FileManagerLayout: React.FC<FileManagerLayoutProps> = (props) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'size' | 'date'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [showKeyboardHelp, setShowKeyboardHelp] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Filter and sort items based on search and sort settings
  const filteredAndSortedItems = React.useMemo(() => {
    let filtered = props.items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          const aSize = a.type === 'file' ? (a as any).size || 0 : 0;
          const bSize = b.type === 'file' ? (b as any).size || 0 : 0;
          comparison = aSize - bSize;
          break;
        case 'date':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [props.items, searchTerm, sortBy, sortOrder]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+A to select all
      if (e.ctrlKey && e.key === 'a' && props.enableMultiSelect) {
        e.preventDefault();
        props.handleSelectAll(true);
      }
      
      // Delete key to delete selected items
      if (e.key === 'Delete' && props.selectedItems.length > 0) {
        e.preventDefault();
        if (window.confirm(t('confirmations.deleteSelectedItems', { count: props.selectedItems.length.toString() }))) {
          props.selectedItems.forEach(id => props.handleDelete(id));
          props.setSelectedItems([]);
        }
      }
      
      // Escape to clear selection or search
      if (e.key === 'Escape') {
        if (props.selectedItems.length > 0) {
          props.setSelectedItems([]);
        } else if (searchTerm) {
          setSearchTerm('');
        }
        if (props.setContextMenu) {
          props.setContextMenu(null);
        }
      }

      // Ctrl+F to focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="' + t('common.search') + '"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // V key to toggle view mode
      if (e.key === 'v' || e.key === 'V') {
        setViewMode(prev => prev === 'list' ? 'grid' : 'list');
      }

      // M key to toggle multi-select
      if (e.key === 'm' || e.key === 'M') {
        props.setEnableMultiSelect(!props.enableMultiSelect);
      }

      // Number keys for sorting
      if (e.key === '1') setSortBy('name');
      if (e.key === '2') setSortBy('size');
      if (e.key === '3') setSortBy('date');
      
      // R key to reverse sort order
      if (e.key === 'r' || e.key === 'R') {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      }

      // F1 key to show help
      if (e.key === 'F1') {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [props.enableMultiSelect, props.selectedItems, props.handleSelectAll, props.handleDelete, props.setSelectedItems, props.setContextMenu, searchTerm, props.setEnableMultiSelect]);

  // Enhanced Drag and Drop functionality
  React.useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only hide if leaving the main container
      if (e.target === document.documentElement || e.relatedTarget === null) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0 && props.fileInputRef?.current) {
        // Create a new DataTransfer object to simulate file input
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        props.fileInputRef.current.files = dt.files;
        
        // Trigger the upload
        const event = new Event('change', { bubbles: true });
        props.fileInputRef.current.dispatchEvent(event);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [props.fileInputRef]);

  // File type icon mapping
  const getFileIcon = (item: any) => {
    if (item.type === 'folder') return '📁';
    
    const name = item.name.toLowerCase();
    const mimeType = item.mimeType || '';
    
    // Archive files
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || mimeType.includes('zip')) {
      return '🗜️';
    }
    
    // Image files
    if (name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/) || mimeType.startsWith('image/')) {
      return '🖼️';
    }
    
    // Video files
    if (name.match(/\.(mp4|avi|mkv|mov|wmv|flv|webm)$/) || mimeType.startsWith('video/')) {
      return '🎬';
    }
    
    // Audio files
    if (name.match(/\.(mp3|wav|flac|aac|ogg|wma)$/) || mimeType.startsWith('audio/')) {
      return '🎵';
    }
    
    // Document files
    if (name.match(/\.(pdf)$/) || mimeType.includes('pdf')) {
      return '📄';
    }
    
    if (name.match(/\.(doc|docx)$/) || mimeType.includes('word')) {
      return '📝';
    }
    
    if (name.match(/\.(xls|xlsx)$/) || mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return '📊';
    }
    
    if (name.match(/\.(ppt|pptx)$/) || mimeType.includes('presentation')) {
      return '📊';
    }
    
    // Text files
    if (name.match(/\.(txt|md|rtf)$/) || mimeType.startsWith('text/')) {
      return '📝';
    }
    
    // Code files
    if (name.match(/\.(js|ts|jsx|tsx|html|css|json|xml|yaml|yml)$/) || mimeType.includes('javascript') || mimeType.includes('json')) {
      return '💻';
    }
    
    return '📄'; // Default file icon
  };

  const getFolderIcon = (folderName: string) => {
    const name = folderName.toLowerCase();
    if (name.includes('download')) return '📥';
    if (name.includes('upload')) return '📤';
    if (name.includes('doc') || name.includes('document')) return '📁';
    if (name.includes('image') || name.includes('photo') || name.includes('picture')) return '🖼️';
    if (name.includes('music') || name.includes('audio')) return '🎵';
    if (name.includes('video') || name.includes('movie')) return '🎬';
    if (name.includes('archive') || name.includes('backup')) return '🗃️';
    return '📁'; // Default folder icon
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar tree */}
      <aside className="w-full lg:w-72 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
        <div className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <span className="text-lg">📁</span>
          <span>{t('common.folderTree')}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              props.currentFolder === null
                ? "bg-blue-50 text-blue-700 font-medium"
                : "hover:bg-gray-50"
            }`}
            onClick={() => props.setCurrentFolder(null)}
          >
            <span className="text-lg">🏠</span>
            <span className="truncate">{t('fileManager.rootFolder')}</span>
          </div>
          {props.folderTree.map((node: any) => (
            <FolderTreeNode
              key={node.id}
              node={node}
              currentFolder={props.currentFolder}
              setCurrentFolder={props.setCurrentFolder}
              getFolderIcon={getFolderIcon}
            />
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div 
        className="flex-1 bg-white rounded-lg shadow-lg p-6 relative"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.setDragSelecting(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Only hide if leaving the main container
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            props.setDragSelecting(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.setDragSelecting(false);
          
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0 && props.fileInputRef?.current) {
            const dt = new DataTransfer();
            files.forEach((file: File) => dt.items.add(file));
            props.fileInputRef.current.files = dt.files;
            
            // Trigger the upload
            const event = new Event('change', { bubbles: true });
            props.fileInputRef.current.dispatchEvent(event);
          }
        }}
      >
        {/* Enhanced Drag overlay for file upload */}
        {(isDragOver || props.dragSelecting) && (
          <div className="absolute inset-0 bg-blue-500/20 border-4 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-40 backdrop-blur-sm">
            <div className="text-center p-6 bg-white rounded-xl shadow-lg border-2 border-blue-500">
              <div className="text-5xl mb-3 animate-bounce">📁</div>
              <div className="text-xl font-bold text-blue-700 mb-1">{t('fileManager.dropFilesHere')}</div>
              <div className="text-blue-600 text-sm">{t('fileManager.dropFilesDescription')}</div>
            </div>
          </div>
        )}
        {/* Drag overlay for file upload */}
        <div
          className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center text-blue-700 font-semibold text-lg opacity-0 pointer-events-none transition-opacity"
          style={{
            opacity: props.dragSelecting ? 1 : 0,
            pointerEvents: props.dragSelecting ? 'auto' : 'none'
          }}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">📁</div>
            <div>{t('fileManager.dropFilesHere')}</div>
          </div>
        </div>

        <header className="flex items-center gap-3 border-b pb-4 mb-4">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="6" fill="#2563eb"/>
            <path d="M7 17V7a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.41.59l3.83 3.83A2 2 0 0 1 18 10.83V17a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" fill="#fff"/>
          </svg>
          <h1 ref={props.fileTitleRef} className="text-2xl font-bold text-gray-800">{t('fileManager.title')}</h1>
        </header>

        {/* Upload form */}
        <form onSubmit={props.handleUpload} className="flex gap-2 items-center mb-4">
          <input
            type="file"
            ref={props.fileInputRef}
            className="border rounded px-2 py-1 flex-1"
            multiple
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-1 rounded font-semibold hover:bg-blue-700 min-w-[100px]"
            disabled={props.uploading}
          >
            {props.uploading ? t('common.uploading') : t('common.upload')}
          </button>
        </form>

        {/* Error display */}
        {props.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl flex-shrink-0 mt-0.5">⚠️</span>
              <div className="text-red-700 text-sm whitespace-pre-line leading-relaxed">
                {props.error}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg border">
          {/* Left side - View controls */}
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={t('common.listMode')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={t('common.gridMode')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>

            {/* Multi-select toggle */}
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={props.enableMultiSelect}
                onChange={(e) => props.setEnableMultiSelect(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{t('common.multiSelect')}</span>
            </label>

            {/* Selected items indicator */}
            {props.enableMultiSelect && props.selectedItems.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                <span className="text-sm font-medium">{props.selectedItems.length} {t('common.selectedItems')}</span>
                <button
                  onClick={() => {
                    if (window.confirm(t('confirmations.deleteSelectedItems'))) {
                      props.selectedItems.forEach(id => props.handleDelete(id));
                      props.setSelectedItems([]);
                    }
                  }}
                  className="text-sm px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  {t('common.deleteAll')}
                </button>
                <button
                  onClick={() => props.setSelectedItems([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  title={t('common.deselectAll')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Right side - Search and Sort */}
          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="name-asc">{t('common.nameAsc')}</option>
                <option value="name-desc">{t('common.nameDesc')}</option>
                <option value="size-asc">{t('common.sizeAsc')}</option>
                <option value="size-desc">{t('common.sizeDesc')}</option>
                <option value="date-asc">{t('common.dateAsc')}</option>
                <option value="date-desc">{t('common.dateDesc')}</option>
              </select>
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder={t('fileManager.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-2 w-64 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
                  title={t('fileManager.searchClear')}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Results info */}
            <div className="text-sm text-gray-500">
              {searchTerm ? (
                `${filteredAndSortedItems.length} kết quả`
              ) : (
                `${props.items.length} mục`
              )}
            </div>

            {/* Help button */}
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Phím tắt (F1)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Breadcrumb navigation */}
        <Breadcrumb
          items={props.currentFolder ? [{ id: props.currentFolder, name: t('fileManager.currentFolder') }] : []}
          onNavigate={(folderId) => {
            if (props.setCurrentFolder) {
              props.setCurrentFolder(folderId);
            }
          }}
        />

        {/* Create folder form */}
        {props.creatingFolder && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">📁</span>
              <input
                type="text"
                value={props.newFolderName}
                onChange={(e) => props.setNewFolderName(e.target.value)}
                placeholder={t('fileManager.enterFolderName')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && props.newFolderName.trim()) {
                    // Handle create folder
                    const createFolder = async () => {
                      try {
                        const response = await fetch('/api/folders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: props.newFolderName.trim(),
                            parentId: props.currentFolder
                          })
                        });
                        if (response.ok) {
                          props.setCreatingFolder(false);
                          props.setNewFolderName('');
                          props.fetchItems(props.currentFolder);
                        } else {
                          const error = await response.text();
                          props.setError(t('messages.folderCreateFailed', { error }));
                        }
                      } catch (error) {
                        props.setError(t('messages.folderCreateError', { error: error.toString() }));
                      }
                    };
                    createFolder();
                  } else if (e.key === 'Escape') {
                    props.setCreatingFolder(false);
                    props.setNewFolderName('');
                  }
                }}
              />
              <button
                onClick={() => {
                  props.setCreatingFolder(false);
                  props.setNewFolderName('');
                }}
                className="px-3 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
        
        {/* File & Folder table */}
        <div className="mt-4">
          {/* Enhanced Toolbar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left side - View mode and multi-select */}
              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title={t('toolbar.listView')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title={t('toolbar.gridView')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>

                {/* Multi-select toggle */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={props.enableMultiSelect}
                    onChange={(e) => props.setEnableMultiSelect(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>{t('common.multiSelect')}</span>
                </label>

                {/* Selected items info */}
                {props.enableMultiSelect && props.selectedItems.length > 0 && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                    <span>{t('common.selected', { count: props.selectedItems.length.toString() })}</span>
                    <button
                      onClick={() => {
                        if (window.confirm(t('confirmations.deleteSelectedFiles'))) {
                          props.selectedItems.forEach(id => props.handleDelete(id));
                          props.setSelectedItems([]);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 ml-2 font-medium"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
              </div>

              {/* Right side - Search and sort */}
              <div className="flex items-center gap-4">
                {/* Sort options */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('common.sort')}:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'date')}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="name">Tên</option>
                    <option value="size">Kích thước</option>
                    <option value="date">Ngày</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1 text-gray-600 hover:text-gray-800"
                    title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {sortOrder === 'asc' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      )}
                    </svg>
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <svg
                    className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 hover:text-gray-600"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* File Content */}
          {viewMode === 'list' ? (
            /* Simple Table for now - Advanced FileTableNew temporarily disabled */
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {props.enableMultiSelect && (
                      <th className="text-left p-3 border-b font-medium text-gray-700 w-12">
                        <input
                          type="checkbox"
                          checked={filteredAndSortedItems.length > 0 && props.selectedItems.length === filteredAndSortedItems.length}
                          onChange={(e) => props.handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </th>
                    )}
                    <th className="text-left p-3 border-b font-medium text-gray-700">Tên</th>
                    <th className="text-left p-3 border-b font-medium text-gray-700">Kích thước</th>
                    <th className="text-left p-3 border-b font-medium text-gray-700">Ngày sửa đổi</th>
                    <th className="text-left p-3 border-b font-medium text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedItems.length > 0 ? (
                    filteredAndSortedItems.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-gray-50 transition-colors ${props.isSelected(item.id) ? 'bg-blue-50' : ''}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (props.setContextMenu) {
                            props.setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              item: item,
                              selectedItems: props.selectedItems.includes(item.id) ? 
                                props.selectedItems.map(id => props.items.find(i => i.id === id)).filter(Boolean) : 
                                [item]
                            });
                          }
                        }}
                      >
                        {props.enableMultiSelect && (
                          <td className="p-3 border-b">
                            <input
                              type="checkbox"
                              checked={props.isSelected(item.id)}
                              onChange={(e) => props.handleSelect(item.id, e)}
                              className="rounded border-gray-300"
                            />
                          </td>
                        )}
                        <td className="p-3 border-b">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getFileIcon(item)}</span>
                            <span 
                              className={`truncate ${item.type === 'folder' ? 'text-blue-600 cursor-pointer hover:underline' : 'cursor-pointer hover:text-blue-600'}`}
                              onClick={() => {
                                if (item.type === 'folder') {
                                  props.setCurrentFolder(item.id);
                                }
                              }}
                            >
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 border-b text-sm text-gray-600">
                          {item.type === 'folder' ? '—' : (item.type === 'file' && (item as any).size ? `${Math.round((item as any).size / 1024)} KB` : '—')}
                        </td>
                        <td className="p-3 border-b text-sm text-gray-600">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="p-3 border-b">
                          <div className="flex gap-2">
                            {item.type === 'file' && (
                              <button
                                onClick={() => {
                                  const downloadUrl = `/api/file-public?id=${item.id}`;
                                  const link = document.createElement('a');
                                  link.href = downloadUrl;
                                  link.download = item.name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
                              >
                                Tải xuống
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc muốn xóa "${item.name}"?`)) {
                                  props.handleDelete(item.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={props.enableMultiSelect ? 5 : 4} className="p-8 text-center text-gray-500">
                        {props.loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>Đang tải...</span>
                          </div>
                        ) : searchTerm ? (
                          <div>
                            <div className="text-4xl mb-4">🔍</div>
                            <div className="text-gray-500 text-lg">Không tìm thấy kết quả</div>
                            <div className="text-sm text-gray-400 mt-2">Thử tìm kiếm với từ khóa khác</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-6xl mb-4">📂</div>
                            <div className="text-gray-500 text-lg">{t('fileManager.emptyFolder')}</div>
                            <div className="text-sm text-gray-400 mt-2">{t('fileManager.emptyFolderDescription')}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredAndSortedItems.length > 0 ? (
                filteredAndSortedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`relative group p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${
                      props.isSelected(item.id) ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        props.handleSelect(item.id, e);
                      } else if (item.type === 'folder') {
                        props.setCurrentFolder(item.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (props.setContextMenu) {
                        props.setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          item: item,
                          selectedItems: props.selectedItems.includes(item.id) ? 
                            props.selectedItems.map(id => props.items.find(i => i.id === id)).filter(Boolean) : 
                            [item]
                        });
                      }
                    }}
                  >
                    {/* Multi-select checkbox */}
                    {props.enableMultiSelect && (
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={props.isSelected(item.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            props.handleSelect(item.id, e);
                          }}
                          className="rounded border-gray-300"
                        />
                      </div>
                    )}

                    {/* File/Folder Icon */}
                    <div className="text-center">
                      <div className="text-4xl mb-2">
                        {getFileIcon(item)}
                      </div>
                      
                      {/* File/Folder Name */}
                      <div className="font-medium text-gray-800 text-sm truncate mb-1" title={item.name}>
                        {item.name}
                      </div>
                      
                      {/* File Size */}
                      {item.type === 'file' && (item as any).size && (
                        <div className="text-xs text-gray-500">
                          {Math.round((item as any).size / 1024)} KB
                        </div>
                      )}
                      
                      {/* Creation Date */}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        {item.type === 'file' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const downloadUrl = `/api/file-public?id=${item.id}`;
                              const link = document.createElement('a');
                              link.href = downloadUrl;
                              link.download = item.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="p-1 bg-white bg-opacity-90 rounded shadow-sm text-blue-600 hover:text-blue-800"
                            title={t('common.download')}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Bạn có chắc muốn xóa "${item.name}"?`)) {
                              props.handleDelete(item.id);
                            }
                          }}
                          className="p-1 bg-white bg-opacity-90 rounded shadow-sm text-red-600 hover:text-red-800"
                          title={t('common.delete')}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  {props.loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Đang tải...</span>
                    </div>
                  ) : searchTerm ? (
                    <div>
                      <div className="text-4xl mb-4">🔍</div>
                      <div className="text-gray-500 text-lg">Không tìm thấy kết quả</div>
                      <div className="text-sm text-gray-400 mt-2">Thử tìm kiếm với từ khóa khác</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-6xl mb-4">📂</div>
                      <div className="text-gray-500 text-lg">Thư mục trống</div>
                      <div className="text-sm text-gray-400 mt-2">{t('fileManager.emptyFolderDescription')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* FileTableNew 
          items={props.items}
          enableMultiSelect={props.enableMultiSelect}
          selectedItems={props.selectedItems}
          isSelected={props.isSelected}
          handleSelect={props.handleSelect}
          handleSelectAll={props.handleSelectAll}
          renaming={props.renaming}
          setRenaming={props.setRenaming}
          renameInputRef={props.renameInputRef}
          setError={props.setError}
          fetchItems={props.fetchItems}
          currentFolder={props.currentFolder}
          setCurrentFolder={props.setCurrentFolder}
          getFileIcon={getFileIcon}
          onShowModal={() => {}}
          onToggleMultiSelect={(enabled) => {
            if (props.setEnableMultiSelect) {
              props.setEnableMultiSelect(enabled);
            }
          }}
          onDelete={(ids) => {
            ids.forEach(id => {
              const item = props.items.find(i => i.id === id);
              if (item) {
                props.handleDelete(id);
              }
            });
          }}
          onDownload={(item) => {
            const downloadUrl = `/api/file-public?id=${item.id}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = item.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        */}
      </div>

      {/* Floating action button for create folder */}
      {!props.creatingFolder && (
        <button
          onClick={() => props.setCreatingFolder(true)}
          className="fixed bottom-6 right-20 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
          title="Tạo thư mục mới"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Phím tắt</h3>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Điều hướng & Chọn</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Chọn tất cả</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+A</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Xóa đã chọn</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Delete</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Bỏ chọn / Thoát</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Tìm kiếm & Lọc</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Tìm kiếm</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+F</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Sắp xếp theo tên</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">1</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Sắp xếp theo kích thước</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">2</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Sắp xếp theo ngày</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">3</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Đảo thứ tự</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">R</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Chế độ xem</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Chuyển chế độ xem</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">V</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Chế độ chọn nhiều</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">M</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Hiện trợ giúp</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">F1</kbd>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500">
                    💡 Mẹo: Giữ Ctrl và click để chọn nhiều mục, hoặc Shift+Click để chọn dải mục
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagerLayout;
