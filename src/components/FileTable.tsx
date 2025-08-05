import React from "react";
import { Item } from "./types";
import { useToast } from "./ToastProvider";
import { useKeyboardShortcuts } from "../lib/useKeyboardShortcuts";
import { useErrorHandler } from "./ErrorBoundary";
import { useLanguage } from "@/contexts/LanguageContext";
import FileTableToolbar from "./FileTableToolbar";

interface MultiSelectActions {
  onDelete?: (ids: string[]) => void;
  onMove?: (ids: string[]) => void;
  onCopy?: (ids: string[]) => void;
  onCompress?: (ids: string[]) => void;
}

interface FileTableProps {
  items: Item[];
  enableMultiSelect: boolean;
  selectedItems: string[];
  isSelected: (id: string) => boolean;
  handleSelect: (id: string, e: React.MouseEvent | React.ChangeEvent) => void;
  handleSelectAll: (checked: boolean) => void;
  renaming: { id: string; type: 'file' | 'folder'; name: string } | null;
  setRenaming: (v: { id: string; type: 'file' | 'folder'; name: string } | null) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  setError: (v: string) => void;
  fetchItems: (parentId?: string | null) => void;
  currentFolder: string | null;
  setCurrentFolder?: (id: string | null) => void;
  isLoading?: boolean;
  uploadProgress?: number;
  multiSelectActions?: MultiSelectActions;
  onToggleMultiSelect?: (enabled: boolean) => void;
  getFileIcon?: (item: any) => string;
}

const FileTable: React.FC<FileTableProps> = ({
  items,
  enableMultiSelect,
  selectedItems,
  isSelected,
  handleSelect,
  handleSelectAll,
  renaming,
  setRenaming,
  renameInputRef,
  setError,
  fetchItems,
  currentFolder,
  setCurrentFolder,
  isLoading = false,
  uploadProgress = 0,
  multiSelectActions,
  onToggleMultiSelect,
  getFileIcon = (item) => item.type === 'folder' ? '📁' : '📄'
}) => {
  const { success, error: showError, info } = useToast();
  const { handleError } = useErrorHandler();
  const { t } = useLanguage();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSelectAll: () => {
      if (enableMultiSelect && items.length > 0) {
        const allSelected = selectedItems.length === items.length;
        handleSelectAll(!allSelected);
        info(allSelected ? 'Deselected all items' : `Selected ${items.length} items`);
      }
    },
    onDelete: () => {
      if (selectedItems.length > 0 && multiSelectActions?.onDelete) {
        console.log('🚀 [FileTable] Starting delete request for selected items:', selectedItems);
        multiSelectActions.onDelete(selectedItems);
      }
    },
    onCopy: () => {
      if (selectedItems.length > 0 && multiSelectActions?.onCopy) {
        multiSelectActions.onCopy(selectedItems);
      }
    },
    onRefresh: () => {
      fetchItems(currentFolder);
      success('Refreshed', 'File list updated');
    },
    onEscape: () => {
      if (selectedItems.length > 0) {
        handleSelectAll(false);
        info('Selection cleared');
      }
      if (renaming) {
        setRenaming(null);
      }
    }
  }, true);

  // Xử lý nén files
  const handleCompressFiles = async (fileIds: string[], zipName: string) => {
    console.log('� [FileTable] Starting compress request for files:', fileIds, 'to:', zipName);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/files/compress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileIds, zipName }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ [FileTable] Compress request completed successfully:', data.file.name);
        success('Files compressed successfully', `Created ${data.file.name}`);
        fetchItems(currentFolder);
        handleSelectAll(false); // Clear selection
      } else {
        console.log('❌ [FileTable] Compress request failed:', data.error);
        showError('Compression failed', data.error);
      }
    } catch (error) {
      console.error('❌ [FileTable] Compress request error:', error);
      showError('Compression failed', 'An error occurred while compressing files');
      handleError(error as Error);
    }
  };

  // Xử lý giải nén file
  const handleExtractFile = async (fileId: string) => {
    console.log('� [FileTable] Starting extract request for file:', fileId);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/files/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileId, folderId: currentFolder }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ [FileTable] Extract request completed successfully:', data.files.length, 'files');
        success('File extracted successfully', `Extracted ${data.files.length} files`);
        fetchItems(currentFolder);
        handleSelectAll(false); // Clear selection
      } else {
        console.log('❌ [FileTable] Extract request failed:', data.error);
        showError('Extraction failed', data.error);
      }
    } catch (error) {
      console.error('❌ [FileTable] Extract request error:', error);
      showError('Extraction failed', 'An error occurred while extracting file');
      handleError(error as Error);
    }
  };

  // Ref object để lưu click count/timer cho từng item id
  const clickCountMapRef = React.useRef<{ [id: string]: number }>({});
  const clickTimerMapRef = React.useRef<{ [id: string]: NodeJS.Timeout | null }>({});
  // XÓA dòng này:
  // const contextMenuRowRef = React.useRef<HTMLElement | null>(null);

  // SỬA effect highlight context menu row:
  React.useEffect(() => {
    const removeRing = () => {
      if ((window as any).contextMenuRowRef) {
        try {
          (window as any).contextMenuRowRef.classList.remove('ring-2', 'ring-blue-400');
        } catch {}
        (window as any).contextMenuRowRef = null;
      }
    };
    window.addEventListener('closeContextMenu', removeRing);
    return () => window.removeEventListener('closeContextMenu', removeRing);
  }, []);

  // Đóng input rename khi click ra ngoài
  React.useEffect(() => {
    if (renaming) {
      const handleClickOutside = (e: MouseEvent) => {
        // Nếu không phải input đang rename hoặc row đang rename thì tắt
        const input = document.activeElement;
        if (input !== null && input instanceof HTMLInputElement && input === document.activeElement) {
          // Nếu đang focus input thì không tắt
          return;
        }
        setRenaming(null);
      };
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [renaming]);

  // Tắt highlight khi click bên ngoài
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Kiểm tra nếu click vào table hoặc các phần tử con của table
      if (tableRef.current && tableRef.current.contains(target)) {
        return; // Click trong table thì không làm gì
      }
      
      // Kiểm tra nếu click vào context menu
      if (target.closest('.context-menu')) {
        return; // Click vào context menu thì không tắt highlight
      }
      
      // Click bên ngoài table -> tắt tất cả highlight
      setDragHighlightedIds([]);
      
      // Nếu có callback để clear selected items từ parent component
      if (enableMultiSelect && selectedItems.length > 0) {
        handleSelectAll(false); // Bỏ chọn tất cả
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [enableMultiSelect, selectedItems, handleSelectAll]);

  const [dragStart, setDragStart] = React.useState<{x: number, y: number} | null>(null);
  const [dragEnd, setDragEnd] = React.useState<{x: number, y: number} | null>(null);
  const [dragRect, setDragRect] = React.useState<{left: number, top: number, width: number, height: number} | null>(null);
  const [dragHighlightedIds, setDragHighlightedIds] = React.useState<string[]>([]);
  const tableRef = React.useRef<HTMLTableElement>(null);

  // Xử lý sự kiện kéo chuột trái để chọn nhiều dòng
  React.useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // chỉ chuột trái
      if (!tableRef.current) return;
      // Chỉ bắt đầu drag nếu click vào tbody hoặc tr
      const target = e.target as HTMLElement;
      if (!tableRef.current.contains(target)) return;
      
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragEnd(null);
      setDragRect(null);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;
      
      setDragEnd({ x: e.clientX, y: e.clientY });
      // Tính toán vùng chọn
      const left = Math.min(dragStart.x, e.clientX);
      const top = Math.min(dragStart.y, e.clientY);
      const width = Math.abs(dragStart.x - e.clientX);
      const height = Math.abs(dragStart.y - e.clientY);
      const currentDragRect = { left, top, width, height };
      setDragRect(currentDragRect);
      
      // Highlight các dòng trong vùng kéo ngay lập tức
      if (tableRef.current) {
        const rows = tableRef.current.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const rect = row.getBoundingClientRect();
          const overlap =
            rect.left < currentDragRect.left + currentDragRect.width &&
            rect.left + rect.width > currentDragRect.left &&
            rect.top < currentDragRect.top + currentDragRect.height &&
            rect.top + rect.height > currentDragRect.top;
          
          const rowElement = row as HTMLElement;
          if (overlap) {
            // Highlight tạm thời khi đang kéo - dùng cùng màu với sau khi chọn
            rowElement.style.backgroundColor = '#dbeafe';
            rowElement.style.borderColor = '#bae6fd';
          } else {
            // Bỏ highlight tạm thời
            rowElement.style.backgroundColor = '';
            rowElement.style.borderColor = '';
          }
        });
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!dragRect || !tableRef.current) {
        setDragStart(null);
        setDragEnd(null);
        setDragRect(null);
        return;
      }
      
      // Chỉ log thông tin, lưu các ID được highlight để giữ màu
      const highlightedIds: string[] = [];
      const rows = tableRef.current.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        const overlap =
          rect.left < dragRect.left + dragRect.width &&
          rect.left + rect.width > dragRect.left &&
          rect.top < dragRect.top + dragRect.height &&
          rect.top + rect.height > dragRect.top;
        if (overlap) {
          const id = row.getAttribute('data-id');
          if (id) {
            highlightedIds.push(id);
          }
        }
      });
      
      // Lưu danh sách các ID được highlight để giữ màu
      setDragHighlightedIds(highlightedIds);
      
      setDragStart(null);
      setDragEnd(null);
      setDragRect(null);
    };
    
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragStart, dragRect, enableMultiSelect, handleSelectAll, handleSelect, isSelected]);

  // Effect để đảm bảo highlight các dòng được chọn và drag-highlighted
  React.useEffect(() => {
    if (!tableRef.current) return;
    
    const rows = tableRef.current.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
      const id = row.getAttribute('data-id');
      if (id) {
        const isItemSelected = selectedItems.includes(id);
        const isDragHighlighted = dragHighlightedIds.includes(id);
        const rowElement = row as HTMLElement;
        
        if (isItemSelected || isDragHighlighted) {
          // Highlight cho dòng được chọn hoặc drag-highlighted
          rowElement.style.backgroundColor = '#dbeafe';
        } else {
          // Bỏ highlight
          rowElement.style.backgroundColor = '';
        }
      }
    });
  }, [selectedItems, dragHighlightedIds]);

  return (
    <div style={{ position: 'relative' }}>
      {/* FileTable Toolbar */}
      {/* <FileTableToolbar
        selectedCount={selectedItems.length}
        totalCount={items.length}
        enableMultiSelect={enableMultiSelect}
        onToggleMultiSelect={(enabled) => onToggleMultiSelect?.(enabled)}
        onSelectAll={(checked) => handleSelectAll(checked)}
        onClearSelection={() => handleSelectAll(false)}
        selectedItems={selectedItems}
        onCompressFiles={handleCompressFiles}
        onExtractFile={handleExtractFile}
      /> */}

      {/* Loading Progress Bar */}
      {(isLoading || uploadProgress > 0) && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-x border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isLoading ? t('common.loading') : t('fileManager.uploadProgress', { progress: Math.round(uploadProgress).toString() })}
            </span>
            {uploadProgress > 0 && (
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {Math.round(uploadProgress)}%
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isLoading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
              }`}
              style={{ 
                width: isLoading ? '100%' : `${uploadProgress}%`,
                animation: isLoading ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Drag Selection Rectangle */}
      {dragRect && (
        <div
          style={{
            position: 'fixed',
            left: dragRect.left,
            top: dragRect.top,
            width: dragRect.width,
            height: dragRect.height,
            background: 'rgba(59,130,246,0.15)',
            border: '2px solid #3b82f6',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}
      <table ref={tableRef} className="w-full text-sm border border-gray-200 rounded-b-lg">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-b border-gray-200">
            {enableMultiSelect && (
              <th className="p-1 w-10">
                <input 
                  type="checkbox" 
                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500" 
                  checked={selectedItems.length === items.length && items.length > 0} 
                  onChange={e => handleSelectAll(e.target.checked)} 
                />
              </th>
            )}
            <th className="p-2 text-left font-medium text-gray-800 text-sm">Tên tệp</th>
            <th className="p-2 text-left font-medium text-gray-800 text-sm w-20">Kích thước</th>
            <th className="p-2 text-left font-medium text-gray-800 text-sm w-32">{t('common.date')}</th>
            <th className="p-1 text-center font-medium text-gray-800 text-sm w-12">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const isRenaming = renaming && renaming.id === item.id && renaming.type === item.type;
            const selected = isSelected(item.id);
            // Click/double/triple click logic (không dùng hook trong map)
            const handleRowClick = (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') return;
              const id = item.id;
              if (!clickCountMapRef.current[id]) clickCountMapRef.current[id] = 0;
              clickCountMapRef.current[id]++;
              if (clickTimerMapRef.current[id]) clearTimeout(clickTimerMapRef.current[id]!);
              clickTimerMapRef.current[id] = setTimeout(() => {
                if (clickCountMapRef.current[id] === 1) {
                  // Single click: nếu là folder thì chuyển currentFolder, nếu là file thì không làm gì
                  if (!isRenaming && item.type === 'folder' && typeof setCurrentFolder === 'function') {
                    setCurrentFolder(item.id);
                  }
                } else if (clickCountMapRef.current[id] === 2) {
                  // Double click
                  if (!isRenaming) {
                    if (item.type === 'folder') setRenaming({ id: item.id, type: 'folder', name: item.name });
                    else setRenaming({ id: item.id, type: 'file', name: item.name });
                  }
                } else if (clickCountMapRef.current[id] === 3) {
                  // Triple click
                  // Custom logic cho triple click nếu muốn
                }
                clickCountMapRef.current[id] = 0;
                clickTimerMapRef.current[id] = null;
              }, 400);
            };
            if (item.type === 'folder') {
              const isRenamingRow = isRenaming;
              return (
                <tr
                  key={item.id}
                  data-id={item.id}
                  className={`border-t group cursor-pointer transition-all duration-200 ${
                    selected 
                      ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm' 
                      : 'hover:bg-gray-50 hover:shadow-sm border-gray-200'
                  }`}
                  style={selected ? { 
                    backgroundColor: '#dbeafe',
                    borderLeft: '4px solid #3b82f6',
                    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.2)'
                  } : {}}
                  onClick={handleRowClick}
                  onContextMenu={e => {
                    e.preventDefault();
                    
                    // Tắt vùng sáng cũ nếu có
                    if ((window as any).contextMenuRowRef && (window as any).contextMenuRowRef !== e.currentTarget) {
                      (window as any).contextMenuRowRef.classList.remove('ring-2', 'ring-blue-400');
                    }
                    e.currentTarget.classList.add('ring-2', 'ring-blue-400');
                    (window as any).contextMenuRowRef = e.currentTarget;
                    
                    // Tính tổng số items được chọn (selected + drag-highlighted)
                    const allSelectedIds = [...new Set([...selectedItems, ...dragHighlightedIds])];
                    const isMultipleSelection = allSelectedIds.length > 1;
                    const currentItemSelected = allSelectedIds.includes(item.id);
                    
                    if (typeof window !== 'undefined' && (window as any).showContextMenu) {
                      if (isMultipleSelection && currentItemSelected) {
                        // Context menu cho nhiều items
                        (window as any).showContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          multipleItems: {
                            count: allSelectedIds.length,
                            ids: allSelectedIds,
                            hasFiles: allSelectedIds.some(id => {
                              const foundItem = items.find(i => i.id === id);
                              return foundItem?.type === 'file';
                            }),
                            hasFolders: allSelectedIds.some(id => {
                              const foundItem = items.find(i => i.id === id);
                              return foundItem?.type === 'folder';
                            }),
                            actions: {
                              onDelete: () => {
                                if (window.confirm(`Xác nhận xóa ${allSelectedIds.length} mục đã chọn?`)) {
                                  multiSelectActions?.onDelete?.(allSelectedIds);
                                }
                              },
                              onMove: () => {
                                multiSelectActions?.onMove?.(allSelectedIds);
                              },
                              onCopy: () => {
                                multiSelectActions?.onCopy?.(allSelectedIds);
                              },
                              onCompress: () => {
                                multiSelectActions?.onCompress?.(allSelectedIds);
                              }
                            }
                          },
                          type: 'multiple',
                        });
                      } else {
                        // Context menu cho item đơn lẻ
                        (window as any).showContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          folder: item,
                          type: 'folder',
                          actions: {
                            onRename: () => {
                              setRenaming({ id: item.id, type: 'folder', name: item.name });
                            },
                            onDelete: () => {
                              if (window.confirm(t('confirmations.deleteFolder'))) {
                                console.log('� [FileTable] Starting delete request for folder:', item.id);
                                multiSelectActions?.onDelete?.([item.id]);
                              }
                            },
                            onMove: () => {
                              multiSelectActions?.onMove?.([item.id]);
                            },
                            onCopy: () => {
                              multiSelectActions?.onCopy?.([item.id]);
                            }
                          }
                        });
                      }
                    }
                  }}
                  onPointerUp={e => {
                    e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                    if ((window as any).contextMenuRowRef === e.currentTarget) {
                      (window as any).contextMenuRowRef = null;
                    }
                  }}
                >
                  {enableMultiSelect && (
                    <td className="p-1 w-10">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500" 
                          checked={selected} 
                          onChange={e => handleSelect(item.id, e)} 
                        />
                      </div>
                    </td>
                  )}
                  <td className="p-2 flex items-center gap-1">
                    {selected && <span className="text-blue-600 font-bold text-sm">●</span>}
                    <span className="text-lg">{getFileIcon(item)}</span>
                    <div className="flex flex-col">
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          className="border-2 border-blue-400 rounded-md px-2 py-1 text-sm font-semibold max-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={renaming.name}
                          onChange={e => setRenaming({ ...renaming, name: e.target.value })}
                          onBlur={async () => {
                            if (renaming.name.trim() === item.name || !renaming.name.trim()) {
                              setRenaming(null);
                              return;
                            }
                            // Nếu tên thay đổi, xác nhận và gửi request
                            if (renaming.name.trim() !== item.name) {
                              if (!window.confirm(t('confirmations.renameFolder'))) { setRenaming(null); return; }
                              // Check duplicate name
                              const existsFolder = items.some(
                                (i) => i.name.trim().toLowerCase() === renaming.name.trim().toLowerCase() && i.id !== item.id && i.type === 'folder'
                              );
                              if (existsFolder) { setError(t('errors.folderExists')); setRenaming(null); return; }
                              const existsFile = items.some(
                                (i) => i.name.trim().toLowerCase() === renaming.name.trim().toLowerCase() && i.type === 'file'
                              );
                              if (existsFile) { setError(t('errors.fileExists')); setRenaming(null); return; }
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch('/api/folders', {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ id: item.id, name: renaming.name.trim() }),
                                });
                                const data = await res.json();
                                if (!res.ok) setError(data.error || t('errors.renameFailed'));
                                else fetchItems(currentFolder);
                              } catch { setError(t('errors.renameFolderFailed')); }
                            }
                            setRenaming(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setRenaming(null);
                            }
                          }}
                        />
                      ) : (
                        <div>
                          <span className={`text-sm font-medium ${selected ? 'text-blue-800' : 'text-gray-900'}`} title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-500 block">{t('common.folder')}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                      </svg>
                      <span>{t('common.folder')}</span>
                    </div>
                  </td>
                  <td className="p-2 text-gray-600 text-xs">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="p-1">
                    <div className="flex items-center justify-center">
                      <span className="bg-gray-100 px-1 py-0.5 rounded text-xs text-gray-400">⋯</span>
                    </div>
                  </td>
                </tr>
              );
            } else {
              // File row
              return (
                <tr
                  key={item.id}
                  data-id={item.id}
                  className={`border-t group cursor-pointer transition-all duration-200 ${
                    selected 
                      ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-sm' 
                      : 'hover:bg-gray-50 hover:shadow-sm border-gray-200'
                  }`}
                  style={selected ? { 
                    backgroundColor: '#dbeafe',
                    borderLeft: '4px solid #3b82f6',
                    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.2)'
                  } : {}}
                  onClick={handleRowClick}
                  onContextMenu={e => {
                    e.preventDefault();
                    
                    // Tắt vùng sáng cũ nếu có
                    if ((window as any).contextMenuRowRef && (window as any).contextMenuRowRef !== e.currentTarget) {
                      (window as any).contextMenuRowRef.classList.remove('ring-2', 'ring-blue-400');
                    }
                    e.currentTarget.classList.add('ring-2', 'ring-blue-400');
                    (window as any).contextMenuRowRef = e.currentTarget;
                    
                    // Tính tổng số items được chọn (selected + drag-highlighted)
                    const allSelectedIds = [...new Set([...selectedItems, ...dragHighlightedIds])];
                    const isMultipleSelection = allSelectedIds.length > 1;
                    const currentItemSelected = allSelectedIds.includes(item.id);
                    
                    if (typeof window !== 'undefined' && (window as any).showContextMenu) {
                      if (isMultipleSelection && currentItemSelected) {
                        // Context menu cho nhiều items
                        (window as any).showContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          multipleItems: {
                            count: allSelectedIds.length,
                            ids: allSelectedIds,
                            hasFiles: allSelectedIds.some(id => {
                              const foundItem = items.find(i => i.id === id);
                              return foundItem?.type === 'file';
                            }),
                            hasFolders: allSelectedIds.some(id => {
                              const foundItem = items.find(i => i.id === id);
                              return foundItem?.type === 'folder';
                            }),
                            actions: {
                              onDelete: () => {
                                if (window.confirm(`Xác nhận xóa ${allSelectedIds.length} mục đã chọn?`)) {
                                  multiSelectActions?.onDelete?.(allSelectedIds);
                                }
                              },
                              onMove: () => {
                                multiSelectActions?.onMove?.(allSelectedIds);
                              },
                              onCopy: () => {
                                multiSelectActions?.onCopy?.(allSelectedIds);
                              },
                              onCompress: () => {
                                multiSelectActions?.onCompress?.(allSelectedIds);
                              }
                            }
                          },
                          type: 'multiple',
                        });
                      } else {
                        // Context menu cho item đơn lẻ
                        (window as any).showContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          file: item,
                          type: 'file',
                          actions: {
                            onRename: () => {
                              setRenaming({ id: item.id, type: 'file', name: item.name });
                            },
                            onDelete: () => {
                              if (window.confirm(t('confirmations.deleteFile'))) {
                                console.log('� [FileTable] Starting delete request for file:', item.id);
                                multiSelectActions?.onDelete?.([item.id]);
                              }
                            },
                            onMove: () => {
                              multiSelectActions?.onMove?.([item.id]);
                            },
                            onCopy: () => {
                              multiSelectActions?.onCopy?.([item.id]);
                            },
                            onDownload: () => {
                              // Trigger download using public URL
                              const downloadUrl = `/api/file-public?id=${item.id}`;
                              const link = document.createElement('a');
                              link.href = downloadUrl;
                              link.download = item.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            },
                            onShare: () => {
                              // Generate shareable link
                              alert('Tính năng chia sẻ sẽ được triển khai sau');
                            }
                          }
                        });
                      }
                    }
                  }}
                  onPointerUp={e => {
                    e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                    if ((window as any).contextMenuRowRef === e.currentTarget) {
                      (window as any).contextMenuRowRef = null;
                    }
                  }}
                >
                  {enableMultiSelect && (
                    <td className="p-1 w-10">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500" 
                          checked={selected} 
                          onChange={e => handleSelect(item.id, e)} 
                        />
                      </div>
                    </td>
                  )}
                  <td className="p-2 flex items-center gap-1">
                    {selected && <span className="text-blue-600 font-bold text-sm">●</span>}
                    <span className="text-lg">{getFileIcon(item)}</span>
                    <div className="flex flex-col">
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          className="border-2 border-blue-400 rounded-md px-2 py-1 text-sm max-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={renaming.name}
                          onChange={e => setRenaming({ ...renaming, name: e.target.value })}
                          onBlur={async () => {
                            if (renaming.name.trim() === item.name || !renaming.name.trim()) {
                              setRenaming(null);
                              return;
                            }
                            if (renaming.name.trim() !== item.name) {
                              if (!window.confirm('Xác nhận đổi tên tệp?')) { setRenaming(null); return; }
                              // Check duplicate name
                              const existsFolder = items.some(
                                (i) => i.name.trim().toLowerCase() === renaming.name.trim().toLowerCase() && i.type === 'folder'
                              );
                              if (existsFolder) { setError('Đã có thư mục cùng tên trong thư mục này!'); setRenaming(null); return; }
                              const existsFile = items.some(
                                (i) => i.name.trim().toLowerCase() === renaming.name.trim().toLowerCase() && i.id !== item.id && i.type === 'file'
                              );
                              if (existsFile) { setError('Đã có tệp cùng tên trong thư mục này!'); setRenaming(null); return; }
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`/api/files/${item.id}/rename`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ name: renaming.name.trim() }),
                                });
                                const data = await res.json();
                                if (!res.ok) setError(data.error || 'Đổi tên tệp thất bại');
                                else fetchItems(currentFolder);
                              } catch { setError(t('errors.renameFileError')); }
                            }
                            setRenaming(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            } else if (e.key === 'Escape') {
                              setRenaming(null);
                            }
                          }}
                        />
                      ) : (
                        <div>
                          <span className={`text-sm ${selected ? 'text-blue-800 font-medium' : 'text-gray-900'}`} title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            {item.name.split('.').pop()?.toUpperCase() || 'FILE'} • {(item as any).formattedSize}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-gray-600 text-xs font-medium">{(item as any).formattedSize}</td>
                  <td className="p-2 text-gray-600 text-xs">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="p-1">
                    <div className="flex items-center justify-center">
                      <span className="bg-gray-100 px-1 py-0.5 rounded text-xs text-gray-400">⋯</span>
                    </div>
                  </td>
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FileTable;
