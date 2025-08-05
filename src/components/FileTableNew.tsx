import React from "react";
import { Item } from "./types";
import FileTableToolbar from "./FileTableToolbar";
import { ContextMenuManager } from "../lib/contextMenuManager";
import { StateManager, StateUpdate } from "../lib/stateManager";
import { globalStateManager, GlobalStateUpdate } from "../lib/globalStateManager";
import { useToast } from "./ToastProvider";

interface FileTableNewProps {
  items: Item[];
  enableMultiSelect?: boolean;
  selectedItems?: string[];
  isSelected?: (id: string) => boolean;
  handleSelect?: (id: string, e: React.MouseEvent | React.ChangeEvent) => void;
  handleSelectAll?: (checked: boolean) => void;
  renaming?: { id: string; type: 'file' | 'folder'; name: string } | null;
  setRenaming?: (v: { id: string; type: 'file' | 'folder'; name: string } | null) => void;
  renameInputRef?: React.RefObject<HTMLInputElement | null>;
  setError?: (v: string) => void;
  fetchItems?: (parentId?: string | null) => void;
  currentFolder?: string | null;
  setCurrentFolder?: (id: string | null) => void;
  getFileIcon?: (item: any) => string;
  onDelete?: (ids: string[]) => void;
  onDownload?: (item: Item) => void;
  onToggleMultiSelect?: (enabled: boolean) => void;
  onShowModal?: (modalType: string, data: any) => void;
}

const FileTableNew: React.FC<FileTableNewProps> = ({
  items = [],
  enableMultiSelect = false,
  selectedItems = [],
  isSelected = () => false,
  handleSelect = () => {},
  handleSelectAll = () => {},
  renaming = null,
  setRenaming = () => {},
  renameInputRef,
  setError = () => {},
  fetchItems = () => {},
  currentFolder = null,
  setCurrentFolder = () => {},
  getFileIcon = (item) => item.type === 'folder' ? '📁' : '📄',
  onDelete = () => {},
  onDownload = () => {},
  onToggleMultiSelect = () => {},
  onShowModal = () => {}
}) => {
  const { success, error: showError } = useToast();
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; actions: any[] } | null>(null);
  const [localItems, setLocalItems] = React.useState<Item[]>(items);

  // Sync with parent items
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRowClick = (item: Item, e: React.MouseEvent) => {
    if (e.detail === 2) { // Double click
      if (item.type === 'folder') {
        setCurrentFolder(item.id);
      } else {
        onDownload(item);
      }
    } else if (enableMultiSelect && e.ctrlKey) {
      handleSelect(item.id, e);
    } else if (enableMultiSelect && e.shiftKey) {
      // Handle shift selection logic here if needed
      handleSelect(item.id, e);
    } else if (!enableMultiSelect && item.type === 'folder') {
      setCurrentFolder(item.id);
    }
  };

  const handleContextMenu = (item: Item, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Create a state manager callback
    const stateUpdateCallback = (update: StateUpdate) => {
      setLocalItems(prev => {
        switch (update.type) {
          case 'add':
            return [...prev, ...update.items];
          case 'update':
            return prev.map(prevItem => 
              update.items.find(updateItem => updateItem.id === prevItem.id) || prevItem
            );
          case 'delete':
            const deleteIds = update.items.map(item => item.id);
            return prev.filter(item => !deleteIds.includes(item.id));
          default:
            return prev;
        }
      });
    };

    // Create context menu manager
    const contextMenuManager = new ContextMenuManager(
      () => fetchItems(currentFolder),
      (message) => showError(message),
      (message) => success(message),
      (item) => {
        setRenaming({ id: item.id, type: item.type, name: item.name });
      },
      (modalType, data) => onShowModal(modalType, data),
      new StateManager(stateUpdateCallback)
    );

    // Get actions for this item
    let actions: any[] = [];
    if (item.type === 'file') {
      actions = contextMenuManager.getFileContextMenu(item);
    } else {
      actions = contextMenuManager.getFolderContextMenu(item);
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      actions
    });
  };

  const handleRename = async (newName: string) => {
    if (!renaming) return;
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = renaming.type === 'file' ? `/api/files/${renaming.id}` : `/api/folders/${renaming.id}`;
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        success(`${renaming.type === 'file' ? 'File' : 'Folder'} renamed successfully`);
        
        // Update local state immediately
        setLocalItems(prev => prev.map(item => 
          item.id === renaming.id ? { ...item, name: newName } : item
        ));
        
        // Update global state
        globalStateManager.updateFileTable('update', 
          localItems.map(item => 
            item.id === renaming.id ? { ...item, name: newName } : item
          )
        );
        
        fetchItems(currentFolder);
        setRenaming(null);
      } else {
        const errorData = await response.json();
        showError(errorData.error || `Failed to rename ${renaming.type}`);
      }
    } catch (error) {
      showError(`Failed to rename ${renaming.type}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, newName: string) => {
    if (e.key === 'Enter') {
      handleRename(newName);
    } else if (e.key === 'Escape') {
      setRenaming(null);
    }
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* FileTable Toolbar */}
      <FileTableToolbar
        selectedCount={selectedItems.length}
        totalCount={localItems.length}
        enableMultiSelect={enableMultiSelect}
        onToggleMultiSelect={onToggleMultiSelect}
        onSelectAll={handleSelectAll}
        onClearSelection={() => handleSelectAll(false)}
        selectedItems={selectedItems}
      />
      
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-b border-gray-200">
            {enableMultiSelect && (
              <th className="p-3 w-12">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  checked={selectedItems.length === localItems.length && localItems.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
            )}
            <th className="p-3 text-left font-medium text-gray-800">Tên tệp</th>
            <th className="p-3 text-left font-medium text-gray-800 w-24">Kích thước</th>
            <th className="p-3 text-left font-medium text-gray-800 w-32">Ngày tạo</th>
            <th className="p-3 text-center font-medium text-gray-800 w-16">Tùy chọn</th>
          </tr>
        </thead>
        <tbody>
          {localItems.map((item) => {
            const isRenaming = renaming && renaming.id === item.id && renaming.type === item.type;
            const selected = isSelected(item.id);
            const itemSize = item.type === 'file' ? formatFileSize((item as any).size || 0) : '-';

            return (
              <tr
                key={item.id}
                className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selected ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={(e) => handleRowClick(item, e)}
                onContextMenu={(e) => handleContextMenu(item, e)}
              >
                {enableMultiSelect && (
                  <td className="p-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                      checked={selected} 
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelect(item.id, e);
                      }}
                    />
                  </td>
                )}
                <td className="p-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getFileIcon(item)}</span>
                    <div className="flex-1">
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          defaultValue={item.name}
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onBlur={(e) => handleRename(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, (e.target as HTMLInputElement).value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{item.name}</span>
                      )}
                      {item.type === 'file' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(item as any).mimeType || 'Unknown type'}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-gray-600">{itemSize}</td>
                <td className="p-3 text-gray-600">{formatDate(item.createdAt)}</td>
                <td className="p-3 text-center">
                  <button
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(item, e);
                    }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.actions.map((action, index) => (
            <React.Fragment key={index}>
              {action.separator ? (
                <hr className="my-1 border-gray-200" />
              ) : (
                <button
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                    action.disabled ? 'text-gray-400 cursor-not-allowed' : 
                    action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    if (!action.disabled) {
                      action.onClick();
                      setContextMenu(null);
                    }
                  }}
                  disabled={action.disabled}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {localItems.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <div className="text-4xl mb-4">📁</div>
          <p className="text-lg font-medium mb-2">No files or folders</p>
          <p className="text-sm">This folder is empty. Upload files or create folders to get started.</p>
        </div>
      )}
    </div>
  );
};

export default FileTableNew;
