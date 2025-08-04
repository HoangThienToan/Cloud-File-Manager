import React, { useState, useEffect } from 'react';
import { Item } from './types';

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => void;
  title: string;
  confirmText: string;
  items: Item[];
  fetchFolders: (parentId?: string | null) => Promise<Item[]>;
}

const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmText,
  items,
  fetchFolders,
}) => {
  const [folders, setFolders] = useState<Item[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // Load folders when modal opens and reset state
  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setCurrentPath([]);
      setSelectedFolder(null);
      loadFolders(null);
    }
  }, [isOpen]);

  const loadFolders = async (parentId: string | null) => {
    console.log('FolderPickerModal - Loading folders for parentId:', parentId);
    setLoading(true);
    try {
      const folderList = await fetchFolders(parentId);
      console.log('FolderPickerModal - Received folders:', folderList);
      // API trả về { folders, files } - chúng ta chỉ cần folders và tất cả đều là thư mục
      setFolders(folderList);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = async (folder: Item | null) => {
    console.log('FolderPickerModal - Navigating to folder:', folder);
    if (folder) {
      setCurrentPath([...currentPath, folder]);
      await loadFolders(folder.id);
    } else {
      // Navigate to root
      setCurrentPath([]);
      await loadFolders(null);
    }
    setSelectedFolder(folder?.id || null);
  };

  const navigateUp = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      const parentFolder = newPath[newPath.length - 1];
      setCurrentPath(newPath);
      loadFolders(parentFolder?.id || null);
      setSelectedFolder(parentFolder?.id || null);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedFolder);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-h-[500px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-1 text-sm">
            <button
              onClick={() => navigateToFolder(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              🏠 Trang chủ
            </button>
            {currentPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => {
                    const newPath = currentPath.slice(0, index + 1);
                    setCurrentPath(newPath);
                    loadFolders(folder.id);
                    setSelectedFolder(folder.id);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Đang tải...</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Up navigation */}
              {currentPath.length > 0 && (
                <button
                  onClick={navigateUp}
                  className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-100 rounded"
                >
                  <span className="text-lg">⬆️</span>
                  <span className="text-gray-600">.. (Quay lại)</span>
                </button>
              )}
              
              {/* Current folder selection */}
              <button
                onClick={() => setSelectedFolder(currentPath[currentPath.length - 1]?.id || null)}
                className={`w-full flex items-center gap-3 p-2 text-left rounded border-2 ${
                  selectedFolder === (currentPath[currentPath.length - 1]?.id || null)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-transparent hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">📂</span>
                <span className="font-medium">
                  {currentPath.length > 0 ? 'Thư mục hiện tại' : 'Thư mục gốc'}
                </span>
              </button>

              {/* Folder list */}
              {folders.map((folder) => (
                <div key={folder.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`flex-1 flex items-center gap-3 p-2 text-left rounded border-2 ${
                      selectedFolder === folder.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">📁</span>
                    <span>{folder.name}</span>
                  </button>
                  <button
                    onClick={() => navigateToFolder(folder)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                    title="Mở thư mục"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}

              {folders.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl block mb-2">📂</span>
                  Không có thư mục con
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderPickerModal;
