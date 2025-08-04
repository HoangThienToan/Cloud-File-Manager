import React, { useState, useEffect } from "react";

interface FileManagerProps {
  items: any[];
  loading: boolean;
  error: string;
  fileManager?: any;
}

interface FolderNode {
  id: string | null;
  name: string;
  parentId: string | null;
  children: FolderNode[];
  expanded: boolean;
  level: number;
}

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
    return '📋';
  }
  
  // Code files
  if (name.match(/\.(js|jsx|ts|tsx)$/) || mimeType.includes('javascript')) {
    return '⚡';
  }
  
  if (name.match(/\.(html|htm)$/) || mimeType.includes('html')) {
    return '🌐';
  }
  
  if (name.match(/\.(css|scss|sass|less)$/) || mimeType.includes('css')) {
    return '🎨';
  }
  
  if (name.match(/\.(json)$/) || mimeType.includes('json')) {
    return '⚙️';
  }
  
  if (name.match(/\.(py)$/) || mimeType.includes('python')) {
    return '🐍';
  }
  
  if (name.match(/\.(java)$/) || mimeType.includes('java')) {
    return '☕';
  }
  
  if (name.match(/\.(cpp|c|h)$/) || mimeType.includes('c++')) {
    return '⚙️';
  }
  
  // Text files
  if (name.match(/\.(txt|md|readme)$/) || mimeType.includes('text/')) {
    return '📃';
  }
  
  // Executable files
  if (name.match(/\.(exe|msi|dmg|pkg|deb|rpm)$/) || mimeType.includes('executable')) {
    return '⚙️';
  }
  
  // Default file icon
  return '📄';
};

// Folder icon based on state
const getFolderIcon = (node: FolderNode, isExpanded: boolean) => {
  if (node.id === null) return '💻'; // Computer/Root icon
  
  // Special folder names
  const name = node.name.toLowerCase();
  if (name.includes('document') || name.includes('tài liệu')) return '📂';
  if (name.includes('download') || name.includes('tải xuống')) return '📥';
  if (name.includes('desktop') || name.includes('màn hình')) return '🖥️';
  if (name.includes('picture') || name.includes('hình ảnh')) return '🖼️';
  if (name.includes('music') || name.includes('nhạc')) return '🎵';
  if (name.includes('video') || name.includes('phim')) return '🎬';
  if (name.includes('project') || name.includes('dự án')) return '🚀';
  if (name.includes('backup') || name.includes('sao lưu')) return '💾';
  if (name.includes('temp') || name.includes('tạm')) return '🗂️';
  
  return isExpanded ? '📂' : '📁';
};

function FileManager({ items, loading, error, fileManager }: FileManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [contextMenu, setContextMenu] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build folder tree from items
  useEffect(() => {
    const buildFolderTree = () => {
      const folders = items.filter(item => item.type === 'folder');
      const nodeMap = new Map<string | null, FolderNode>();
      
      // Create root node
      const rootNode: FolderNode = {
        id: null,
        name: "Thư mục gốc",
        parentId: null,
        children: [],
        expanded: true,
        level: 0
      };
      nodeMap.set(null, rootNode);
      
      // Create folder nodes
      folders.forEach((folder: any) => {
        const node: FolderNode = {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId || null,
          children: [],
          expanded: expandedFolders.has(folder.id),
          level: 0
        };
        nodeMap.set(folder.id, node);
      });
      
      // Build tree structure and calculate levels
      const calculateLevel = (node: FolderNode): number => {
        if (node.parentId === null) return 0;
        const parent = nodeMap.get(node.parentId);
        return parent ? calculateLevel(parent) + 1 : 0;
      };
      
      nodeMap.forEach((node, id) => {
        if (id !== null) {
          node.level = calculateLevel(node);
          const parent = nodeMap.get(node.parentId);
          if (parent) {
            parent.children.push(node);
          }
        }
      });
      
      // Sort children by name
      const sortChildren = (node: FolderNode) => {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
        node.children.forEach(sortChildren);
      };
      sortChildren(rootNode);
      
      setFolderTree([rootNode]);
    };
    
    buildFolderTree();
  }, [items, expandedFolders]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Render folder tree node with Windows Explorer style
  const renderFolderNode = (node: FolderNode): React.ReactNode => {
    const isCurrentFolder = fileManager?.currentFolder === node.id;
    const hasChildren = node.children.length > 0;
    const isExpanded = node.expanded && (node.id === null || expandedFolders.has(node.id));
    
    return (
      <div key={node.id || 'root'} className="select-none">
        {/* Current folder row */}
        <div
          className={`flex items-center py-1 px-1 rounded transition-colors text-sm relative ${
            isCurrentFolder 
              ? 'bg-blue-100 text-blue-800 font-medium' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${node.level * 16 + 4}px` }}
        >
          {/* Tree lines */}
          {node.level > 0 && (
            <>
              {/* Vertical lines for parent levels */}
              {Array.from({ length: node.level }, (_, i) => (
                <div
                  key={i}
                  className="absolute border-l border-gray-300"
                  style={{
                    left: `${i * 16 + 12}px`,
                    top: 0,
                    bottom: hasChildren && isExpanded ? '50%' : 0,
                    width: '1px'
                  }}
                />
              ))}
              
              {/* Horizontal line */}
              <div
                className="absolute border-t border-gray-300"
                style={{
                  left: `${(node.level - 1) * 16 + 12}px`,
                  top: '50%',
                  width: '12px',
                  height: '1px'
                }}
              />
            </>
          )}
          
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <button
              className="w-4 h-4 flex items-center justify-center mr-1 hover:bg-gray-200 rounded z-10 bg-white border border-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                if (node.id) toggleFolder(node.id);
              }}
              style={{ marginLeft: node.level === 0 ? '0px' : '2px' }}
            >
              <span className="text-xs font-bold text-gray-600">
                {isExpanded ? '−' : '+'}
              </span>
            </button>
          ) : (
            <div className="w-4 mr-1" style={{ marginLeft: node.level === 0 ? '0px' : '2px' }} />
          )}
          
          {/* Folder icon */}
          <span className="mr-2 text-base">
            {node.id === null ? '🏠' : ''}
          </span>
          
          {/* Folder name - clickable area */}
          <span 
            className="truncate flex-1 cursor-pointer py-1"
            onClick={(e) => {
              e.stopPropagation();
              fileManager?.setCurrentFolder?.(node.id);
            }}
          >
            {node.name}
          </span>
        </div>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child, index) => (
              <div key={child.id} className="relative">
                {/* Vertical line for children */}
                {index < node.children.length - 1 && (
                  <div
                    className="absolute border-l border-gray-300"
                    style={{
                      left: `${node.level * 16 + 12}px`,
                      top: 0,
                      bottom: 0,
                      width: '1px'
                    }}
                  />
                )}
                {renderFolderNode(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // Get current folder path for breadcrumb
  const getCurrentPath = () => {
    if (!fileManager?.currentFolder) return [{ id: null, name: "Thư mục gốc" }];
    
    const path = [];
    let currentId = fileManager.currentFolder;
    
    while (currentId) {
      const folder = items.find(item => item.id === currentId && item.type === 'folder');
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    
    // Add root
    path.unshift({ id: null, name: "Thư mục gốc" });
    return path;
  };

  // Handle right click context menu
  const handleRightClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    const contextMenuItems = [
      {
        label: item.type === 'folder' ? '📂 Mở thư mục' : '📄 Mở tệp',
        onClick: () => {
          if (item.type === 'folder' && fileManager) {
            fileManager.setCurrentFolder(item.id);
          } else if (item.type === 'file') {
            // Download file
            window.open(`/api/files/${item.id}/download`, '_blank');
          }
          setContextMenu(null);
        }
      },
      {
        label: '✏️ Đổi tên',
        onClick: () => {
          if (fileManager?.setRenaming) {
            fileManager.setRenaming(item.id);
          }
          setContextMenu(null);
        }
      },
      {
        label: '📋 Sao chép',
        onClick: () => {
          navigator.clipboard.writeText(item.name);
          setContextMenu(null);
        }
      }
    ];

    // Add compress option for files and folders (but not for ZIP files)
    if (item.type === 'file' || item.type === 'folder') {
      // Don't show compress option for ZIP files
      const isZipFile = item.type === 'file' && (item.name.endsWith('.zip') || item.mimeType === 'application/zip');
      if (!isZipFile) {
        contextMenuItems.push({
          label: '🗜️ Nén thành ZIP',
          onClick: () => {
            const zipName = prompt('Tên file ZIP:', `${item.name}.zip`);
            if (zipName && fileManager?.handleCompress) {
              fileManager.handleCompress([item.id], zipName);
            }
            setContextMenu(null);
          }
        });
      }
    }

    // Add extract option for ZIP files
    if (item.type === 'file' && (item.name.endsWith('.zip') || item.mimeType === 'application/zip')) {
      contextMenuItems.push({
        label: '📦 Giải nén ZIP',
        onClick: () => {
          if (fileManager?.handleExtract) {
            fileManager.handleExtract(item.id);
          }
          setContextMenu(null);
        }
      });
    }

    // Add delete option
    contextMenuItems.push({
      label: '🗑️ Xóa',
      onClick: () => {
        if (confirm(`Bạn có chắc muốn xóa "${item.name}"?`)) {
          fileManager?.handleDelete?.(item.id);
        }
        setContextMenu(null);
      }
    });
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: contextMenuItems
    });
  };
  
  // Handle left click
  const handleLeftClick = (e: React.MouseEvent, item: any) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click for multi-select
      setSelectedItems(prev => 
        prev.includes(item.id) 
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else {
      // Single click
      setSelectedItems([item.id]);
      if (item.type === 'folder' && fileManager) {
        fileManager.setCurrentFolder(item.id);
      }
    }
  };
  
  // Handle double click
  const handleDoubleClick = (item: any) => {
    if (item.type === 'file') {
      // Download file
      window.open(`/api/files/${item.id}/download`, '_blank');
    } else if (item.type === 'folder' && fileManager) {
      fileManager.setCurrentFolder(item.id);
    }
  };
  
  // Close context menu when clicking elsewhere
  const handleBackgroundClick = () => {
    setContextMenu(null);
    setSelectedItems([]);
  };
  
  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col lg:flex-row gap-6" onClick={handleBackgroundClick}>
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="font-semibold text-gray-800 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>📁</span>
              Folders
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  // Collapse all folders
                  setExpandedFolders(new Set());
                }}
                className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100"
                title="Thu gọn tất cả"
              >
                ⊟
              </button>
              <button
                onClick={() => {
                  // Expand all folders
                  const allFolderIds = items
                    .filter(item => item.type === 'folder')
                    .map(folder => folder.id);
                  setExpandedFolders(new Set(allFolderIds));
                }}
                className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100"
                title="Mở rộng tất cả"
              >
                ⊞
              </button>
            </div>
          </div>
        </div>
        
        {/* Folder tree */}
        <div className="p-2 max-h-96 overflow-y-auto">
          <div className="bg-white">
            {folderTree.map(node => renderFolderNode(node))}
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>📁 Folders:</span>
              <span className="font-medium">{items.filter(i => i.type === 'folder').length}</span>
            </div>
            <div className="flex justify-between">
              <span>📄 Files:</span>
              <span className="font-medium">{items.filter(i => i.type === 'file').length}</span>
            </div>
            {items.filter(i => i.type === 'file' && (i.name.endsWith('.zip') || i.mimeType === 'application/zip')).length > 0 && (
              <div className="flex justify-between">
                <span>🗜️ Archives:</span>
                <span className="font-medium">{items.filter(i => i.type === 'file' && (i.name.endsWith('.zip') || i.mimeType === 'application/zip')).length}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          {/* Breadcrumb */}
          <div className="flex items-center mb-4 text-sm">
            {getCurrentPath().map((pathItem, index, array) => (
              <React.Fragment key={pathItem.id || 'root'}>
                <button
                  onClick={() => fileManager?.setCurrentFolder?.(pathItem.id)}
                  className={`hover:text-blue-600 transition-colors ${
                    index === array.length - 1 
                      ? 'text-blue-600 font-semibold' 
                      : 'text-gray-600 hover:underline'
                  }`}
                >
                  {pathItem.name}
                </button>
                {index < array.length - 1 && (
                  <span className="mx-2 text-gray-400">›</span>
                )}
              </React.Fragment>
            ))}
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {fileManager?.currentFolder ? 
                items.find(i => i.id === fileManager.currentFolder)?.name || 'Thư mục con'
                : 'Thư mục gốc'
              }
            </h1>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Xem dạng danh sách"
              >
                📋
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Xem dạng lưới"
              >
                ⊞
              </button>
            </div>
          </div>
          
          {/* Upload form */}
          {fileManager && (
            <form onSubmit={fileManager.handleUpload} className="flex gap-3 items-center">
              <input
                type="file"
                ref={fileManager.fileInputRef}
                className="border border-gray-300 rounded-lg px-3 py-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                multiple
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={fileManager.uploading}
              >
                {fileManager.uploading ? "⏳ Đang tải..." : "📤 Tải lên"}
              </button>
            </form>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-blue-600">⏳ Đang tải...</div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="text-red-800">❌ Lỗi: {error}</div>
            </div>
          )}
          
          {!loading && !error && (
            <>
              {/* Selection info */}
              {selectedItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-blue-800 font-medium">
                      Đã chọn {selectedItems.length} mục
                    </span>
                    <button
                      onClick={() => setSelectedItems([])}
                      className="text-gray-600 hover:text-gray-800 text-sm px-2 py-1 rounded hover:bg-gray-100"
                    >
                      ✕ Bỏ chọn
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Only show compress button if there are non-ZIP items selected */}
                    {selectedItems.some(id => {
                      const item = items.find(i => i.id === id);
                      if (!item) return false;
                      // Show if it's a folder OR a file that's not ZIP
                      return item.type === 'folder' || 
                             (item.type === 'file' && !item.name.endsWith('.zip') && item.mimeType !== 'application/zip');
                    }) && (
                      <button
                        onClick={() => {
                          const zipName = prompt('Tên file ZIP:', `archive_${Date.now()}.zip`);
                          if (zipName && fileManager?.handleCompress) {
                            fileManager.handleCompress(selectedItems, zipName);
                            setSelectedItems([]);
                          }
                        }}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        🗜️ Nén thành ZIP
                      </button>
                    )}
                    
                    {/* Only show extract button if there are ZIP files selected */}
                    {selectedItems.some(id => {
                      const item = items.find(i => i.id === id);
                      return item && item.type === 'file' && (item.name.endsWith('.zip') || item.mimeType === 'application/zip');
                    }) && (
                      <button
                        onClick={() => {
                          // Extract all ZIP files in selection
                          const zipFiles = selectedItems.filter(id => {
                            const item = items.find(i => i.id === id);
                            return item && item.type === 'file' && (item.name.endsWith('.zip') || item.mimeType === 'application/zip');
                          });
                          zipFiles.forEach(id => fileManager?.handleExtract?.(id));
                          setSelectedItems([]);
                        }}
                        className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        📦 Giải nén ZIP
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        if (fileManager?.handleMove) {
                          fileManager.handleMove(selectedItems);
                          setSelectedItems([]);
                        }
                      }}
                      className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-700 transition-colors"
                    >
                      📁 Di chuyển
                    </button>
                    <button
                      onClick={() => {
                        if (fileManager?.handleCopy) {
                          fileManager.handleCopy(selectedItems);
                          setSelectedItems([]);
                        }
                      }}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700 transition-colors"
                    >
                      📋 Sao chép
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa ${selectedItems.length} mục đã chọn?`)) {
                          selectedItems.forEach(id => fileManager?.handleDelete?.(id));
                          setSelectedItems([]);
                        }
                      }}
                      className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              )}
              
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📂</div>
                  <div className="text-gray-500 text-lg">Thư mục trống</div>
                  <div className="text-sm text-gray-400 mt-2">Kéo thả tệp vào đây hoặc sử dụng nút "Tải lên"</div>
                  <div className="text-xs text-gray-400 mt-4 space-y-1">
                    <div>💡 Mẹo: Ctrl+Click để chọn nhiều mục • Chuột phải để hiện menu • Double-click để mở</div>
                    <div>🗜️ Nén: Chỉ với files/folders thường (không nén file ZIP)</div>
                    <div>📦 Giải nén: Chỉ hiển thị khi chọn file ZIP</div>
                  </div>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className={`${
                        viewMode === 'grid' 
                          ? 'p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer'
                          : 'flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer'
                      } ${selectedItems.includes(item.id) ? 'bg-blue-50 border-blue-300' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeftClick(e, item);
                      }}
                      onDoubleClick={() => handleDoubleClick(item)}
                      onContextMenu={(e) => handleRightClick(e, item)}
                    >
                      {viewMode === 'grid' ? (
                        <div className="text-center">
                          <div className="text-4xl mb-2">
                            {item.type === 'folder' ? '📁' : 
                             (item.name.endsWith('.zip') || item.mimeType === 'application/zip') ? '�️' : '�📄'}
                          </div>
                          <div className="font-medium text-gray-800 text-sm truncate">{item.name}</div>
                          {item.type === 'file' && item.formattedSize && (
                            <div className="text-xs text-gray-500 mt-1">{item.formattedSize}</div>
                          )}
                          {item.type === 'file' && (item.name.endsWith('.zip') || item.mimeType === 'application/zip') && (
                            <div className="text-xs text-green-600 mt-1">📦 ZIP</div>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-2xl">
                            {item.type === 'folder' ? '📁' : 
                             (item.name.endsWith('.zip') || item.mimeType === 'application/zip') ? '🗜️' : '📄'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 truncate">
                              {item.name}
                              {item.type === 'file' && (item.name.endsWith('.zip') || item.mimeType === 'application/zip') && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">ZIP</span>
                              )}
                            </div>
                            {item.type === 'file' && item.formattedSize && (
                              <div className="text-sm text-gray-500">{item.formattedSize}</div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white shadow-lg border border-gray-200 rounded-lg py-2 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.items.map((menuItem: any, index: number) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={menuItem.onClick}
            >
              {menuItem.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileManager;
