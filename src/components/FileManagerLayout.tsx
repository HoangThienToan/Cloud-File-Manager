import React from "react";
import { Item } from "./types";
import Breadcrumb from "./Breadcrumb";
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
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A to select all
      if (e.ctrlKey && e.key === 'a' && props.enableMultiSelect) {
        e.preventDefault();
        props.handleSelectAll(true);
      }
      
      // Delete key to delete selected items
      if (e.key === 'Delete' && props.selectedItems.length > 0) {
        e.preventDefault();
        if (window.confirm(`Bạn có chắc muốn xóa ${props.selectedItems.length} mục đã chọn?`)) {
          props.selectedItems.forEach(id => props.handleDelete(id));
          props.setSelectedItems([]);
        }
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        props.setSelectedItems([]);
        if (props.setContextMenu) {
          props.setContextMenu(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [props.enableMultiSelect, props.selectedItems, props.handleSelectAll, props.handleDelete, props.setSelectedItems, props.setContextMenu]);

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
          <span>Cây thư mục</span>
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
            <span className="truncate">Thư mục gốc</span>
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
          if (files.length > 0 && props.fileInputRef.current) {
            // Create a new FileList and assign to input
            const dt = new DataTransfer();
            files.forEach(file => dt.items.add(file));
            props.fileInputRef.current.files = dt.files;
            
            // Trigger upload
            const form = props.fileInputRef.current.closest('form');
            if (form) {
              props.handleUpload({ preventDefault: () => {}, target: form } as any);
            }
          }
        }}
      >
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
            <div>Thả tệp vào đây để tải lên</div>
          </div>
        </div>

        <header className="flex items-center gap-3 border-b pb-4 mb-4">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="6" fill="#2563eb"/>
            <path d="M7 17V7a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.41.59l3.83 3.83A2 2 0 0 1 18 10.83V17a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" fill="#fff"/>
          </svg>
          <h1 ref={props.fileTitleRef} className="text-2xl font-bold text-gray-800">Trình quản lý tệp tin</h1>
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
            {props.uploading ? "Đang upload..." : "Tải lên"}
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

        {/* Breadcrumb navigation */}
        <Breadcrumb
          items={props.currentFolder ? [{ id: props.currentFolder, name: "Thư mục hiện tại" }] : []}
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
                placeholder="Tên thư mục mới..."
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
                          props.setError(`Không thể tạo thư mục: ${error}`);
                        }
                      } catch (error) {
                        props.setError(`Lỗi tạo thư mục: ${error}`);
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
                Hủy
              </button>
            </div>
          </div>
        )}
        
        {/* File & Folder table */}
        <div className="mt-4">
          {/* Search and controls */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={props.enableMultiSelect}
                  onChange={(e) => props.setEnableMultiSelect(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Chọn nhiều tệp</span>
              </label>
              {props.enableMultiSelect && props.selectedItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Đã chọn {props.selectedItems.length} mục</span>
                  <button
                    onClick={() => {
                      if (window.confirm('Bạn có chắc muốn xóa các tệp đã chọn?')) {
                        props.selectedItems.forEach(id => props.handleDelete(id));
                        props.setSelectedItems([]);
                      }
                    }}
                    className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}
            </div>
            
            {/* Quick search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm trong thư mục..."
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                onChange={(e) => {
                  // Simple client-side filter
                  const searchTerm = e.target.value.toLowerCase();
                  const rows = document.querySelectorAll('[data-item-id]');
                  rows.forEach((row: any) => {
                    const itemName = row.querySelector('span')?.textContent?.toLowerCase() || '';
                    row.style.display = itemName.includes(searchTerm) ? '' : 'none';
                  });
                }}
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {props.enableMultiSelect && (
                    <th className="text-left p-3 border-b font-medium text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={props.items.length > 0 && props.selectedItems.length === props.items.length}
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
                {props.items && props.items.length > 0 ? (
                  props.items.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50 transition-colors ${props.isSelected(item.id) ? 'bg-blue-50' : ''}`}
                      data-item-id={item.id}
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
                              if (item.type === 'folder' && props.setCurrentFolder) {
                                props.setCurrentFolder(item.id);
                              } else if (item.type === 'file') {
                                // Preview file or download based on type
                                const isPreviewable = item.mimeType?.startsWith('image/') || 
                                                    item.mimeType?.startsWith('text/') ||
                                                    item.mimeType === 'application/pdf';
                                
                                if (isPreviewable) {
                                  // Open in new window for preview
                                  window.open(`/api/file-public?id=${item.id}`, '_blank');
                                } else {
                                  // Direct download
                                  const downloadUrl = `/api/file-public?id=${item.id}`;
                                  const link = document.createElement('a');
                                  link.href = downloadUrl;
                                  link.download = item.name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                              }
                            }}
                            title={item.type === 'file' ? 'Click để xem trước/tải xuống' : 'Click để mở thư mục'}
                          >
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border-b text-sm text-gray-600">
                        {item.type === 'folder' ? '—' : (item.size ? `${Math.round(item.size / 1024)} KB` : '—')}
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
                      ) : (
                        "Không có tệp tin hoặc thư mục nào"
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
    </div>
  );
};

export default FileManagerLayout;
