import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { globalStateManager } from "./globalStateManager";
import { useToast } from "../components/ToastProvider";
import { translate } from "./i18n";

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  formattedSize: string;
  storageName?: string;
  folderId?: string | null;
  path?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  createdAt: string;
  parentId?: string | null;
  path?: string;
}

export type Item = (FileItem & { type: 'file' }) | (FolderItem & { type: 'folder' });

export function useFileManager(t?: (key: string) => string) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [enableMultiSelect, setEnableMultiSelect] = useState(false);
  const [dragSelecting, setDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragEnd, setDragEnd] = useState<{x: number, y: number} | null>(null);
  const dragBoxRef = useRef<HTMLDivElement>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTitleRef = useRef<HTMLHeadingElement>(null);
  const [renaming, setRenaming] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; file?: FileItem; folder?: FolderItem; type: 'file' | 'folder' }
    | null
  >(null);
  const [folderTree, setFolderTree] = useState<any[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: '🏠 Home' }
  ]);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const lastFetchRef = useRef<string | null>(null);

  // Update home breadcrumb with translation
  useEffect(() => {
    setBreadcrumb(prev => {
      if (prev.length === 1 && prev[0].id === null) {
        return [{ id: null, name: translate('fileManager.rootFolder') }];
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    if (!localStorage.getItem("userId")) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user && data.user.id) {
            localStorage.setItem("userId", data.user.id);
          }
        });
    }
  }, [router]);

  const isSelected = (id: string) => selectedItems.includes(id);

  const handleSelect = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    const idx = items.findIndex(i => i.id === id);
    const isCheckboxEvent = (e as any).target?.type === 'checkbox';
    const isShift = (e as React.MouseEvent).shiftKey;
    const isCtrl = (e as React.MouseEvent).ctrlKey || (e as React.MouseEvent).metaKey;
    
    // If it's a checkbox click and multi-select is enabled, handle multi-select
    if (isCheckboxEvent && enableMultiSelect) {
      setSelectedItems(sel => {
        if (sel.includes(id)) {
          return sel.filter(i => i !== id);
        } else {
          return [...sel, id];
        }
      });
      lastSelectedIndexRef.current = idx;
      return;
    }
    
    // Regular click behavior - respect enableMultiSelect setting
    if (!enableMultiSelect) {
      setSelectedItems([id]);
      lastSelectedIndexRef.current = idx;
      return;
    }
    
    if (isShift && selectedItems.length > 0 && lastSelectedIndexRef.current !== null) {
      const [start, end] = [lastSelectedIndexRef.current, idx].sort((a, b) => a - b);
      const range = items.slice(start, end + 1).map(i => i.id);
      setSelectedItems(range);
    } else if (isCtrl) {
      setSelectedItems(sel => {
        if (sel.includes(id)) {
          if (sel.length === 1 && sel[0] === id) {
            lastSelectedIndexRef.current = idx;
            return sel;
          }
          return sel.filter(i => i !== id);
        } else {
          return [...sel, id];
        }
      });
      lastSelectedIndexRef.current = idx;
    } else {
      setSelectedItems([id]);
      lastSelectedIndexRef.current = idx;
    }
    if (!isShift) {
      lastSelectedIndexRef.current = idx;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!enableMultiSelect) return;
    setSelectedItems(checked ? items.map(i => i.id) : []);
  };

  const fetchItems = useCallback(async (parentId: string | null = null) => {
    const fetchKey = `${parentId || 'root'}-${Date.now()}`;
    console.log('🔍 fetchItems called for parentId:', parentId, 'key:', fetchKey);
    
    // Prevent duplicate calls within 100ms
    if (lastFetchRef.current === (parentId || 'root')) {
      console.log('⚠️ Duplicate fetch prevented for:', parentId);
      return;
    }
    lastFetchRef.current = parentId || 'root';
    
    setTimeout(() => {
      if (lastFetchRef.current === (parentId || 'root')) {
        lastFetchRef.current = null;
      }
    }, 100);
    
    // setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      let url = "/api/folders";
      if (parentId === null) {
        url += `?parentId=null`;
      } else if (parentId) {
        url += `?parentId=${parentId}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || translate('errors.cantGetList'));
      else {
        const folders: Item[] = (data.folders || []).map((f: FolderItem) => ({ ...f, type: 'folder' }));
        const files: Item[] = (data.files || []).map((f: FileItem) => ({ ...f, type: 'file', path: f.path }));
        setItems([...folders, ...files]);
      }
    } catch {
      setError(translate('common.connectionError'));
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setItems]);

  const fetchFolderTree = async () => {
    console.log('🌳 fetchFolderTree called');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/folders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.folderTree) {
        setFolderTree(data.folderTree);
      } else {
        setFolderTree([]);
      }
    } catch {
      setFolderTree([]);
    }
  };

  // Compute breadcrumb using useMemo to avoid unnecessary recalculations
  const computedBreadcrumb = useMemo(() => {
    if (currentFolder === null) {
      return [{ id: null, name: translate('fileManager.rootFolder') }];
    }
    
    // Build breadcrumb path from folderTree
    const buildBreadcrumb = (folderId: string | null, tree: any[], path: Array<{ id: string | null; name: string }> = []): Array<{ id: string | null; name: string }> => {
      if (folderId === null) {
        return [{ id: null, name: translate('fileManager.rootFolder') }, ...path];
      }
      
      for (const folder of tree) {
        if (folder.id === folderId) {
          const newPath = [{ id: folder.id, name: folder.name }, ...path];
          return buildBreadcrumb(folder.parentId, tree, newPath);
        }
        if (folder.children) {
          const result = buildBreadcrumb(folderId, folder.children, path);
          if (result.length > 1 || result[0].id !== null) {
            return result;
          }
        }
      }
      return [{ id: null, name: translate('fileManager.rootFolder') }, ...path];
    };
    
    return buildBreadcrumb(currentFolder, folderTree);
  }, [currentFolder, folderTree]);

  useEffect(() => {
    console.log('📍 useEffect [currentFolder] triggered:', currentFolder);
    fetchItems(currentFolder);
    setSelectedItems([]);
    lastSelectedIndexRef.current = null;
  }, [currentFolder]);

  // Update breadcrumb state when computed breadcrumb changes
  useEffect(() => {
    console.log('🍞 useEffect [computedBreadcrumb] triggered:', computedBreadcrumb);
    setBreadcrumb(computedBreadcrumb);
  }, [computedBreadcrumb]);

  // Emit breadcrumb update after breadcrumb state changes
  useEffect(() => {
    console.log('📡 useEffect [breadcrumb] triggered, length:', breadcrumb.length);
    if (breadcrumb.length > 0) {
      globalStateManager.updateBreadcrumb(breadcrumb);
    }
  }, [breadcrumb]);

  useEffect(() => {
    setEnableMultiSelect(false);
  }, [currentFolder]);

  useEffect(() => {
    fetchFolderTree();
  }, [creatingFolder, currentFolder]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.length) return;
    const fileName = fileInputRef.current.files[0].name;
    const existsFolder = items.some(
      (item) => item.name.trim().toLowerCase() === fileName.trim().toLowerCase() && item.type === 'folder'
    );
    if (existsFolder) {
      setError(translate('errors.folderExists'));
      return;
    }
    const existsFile = items.some(
      (item) => item.name.trim().toLowerCase() === fileName.trim().toLowerCase() && item.type === 'file'
    );
    if (existsFile) {
      setError(translate('errors.fileExists'));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", fileInputRef.current.files[0]);
      if (currentFolder) formData.append("folderId", currentFolder);
      const res = await fetch("/api/files/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('thư mục cùng tên') || data.error?.includes('folder with same name')) {
          const errorMsg = translate('errors.folderExists');
          setError(errorMsg);
          toast.error(translate('toast.uploadFailed'), errorMsg);
        }
        else if (data.error?.includes('tệp cùng tên') || data.error?.includes('file with same name')) {
          const errorMsg = translate('errors.fileExists');
          setError(errorMsg);
          toast.error(translate('toast.uploadFailed'), errorMsg);
        }
        else if (data.error?.includes('File type not allowed')) {
          // Extract file details from error message for better user experience
          const errorMsg = data.error;
          const fileMatch = errorMsg.match(/File: ([^,]+)/);
          const typeMatch = errorMsg.match(/Type: ([^,]+)/);
          const extMatch = errorMsg.match(/Extension: (\w+)/);
          
          const fileName = fileMatch ? fileMatch[1] : 'file';
          const fileType = typeMatch ? typeMatch[1] : 'unknown';
          const fileExt = extMatch ? extMatch[1] : 'unknown';
          
          const userFriendlyError = translate('toast.fileNotAllowed', { fileName });
          const detailedError = translate('errors.fileTypeDetails', { fileType, fileExt });
          
          setError(userFriendlyError);
          toast.error(translate('toast.fileTypeNotAllowed'), detailedError);
        }
        else {
          const errorMsg = data.error || translate('toast.uploadFailed');
          setError(errorMsg);
          toast.error(translate('toast.uploadFailed'), errorMsg);
        }
      } else {
        setError(""); // Clear any previous errors
        toast.success(translate('toast.uploadSuccess'), translate('toast.fileUploadedSuccessfully', { fileName: fileInputRef.current.files[0].name }));
        fetchItems(currentFolder);
      }
    } catch {
      const errorMsg = translate('toast.uploadError');
      setError(errorMsg);
      toast.error(translate('toast.connectionError'), translate('toast.cantConnectToServer'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      // Use public download URL (no authentication required)
      const downloadUrl = `/api/file-public?id=${fileId}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      alert(translate('toast.cantDownloadFile'));
    }
  };

  const handleDelete = async (itemId: string) => {
    // Tìm item để xác định type
    const item = items.find(i => i.id === itemId);
    if (!item) {
      alert(translate('toast.cantFindItemToDelete'));
      return;
    }
    
    const itemType = item.type === 'file' ? translate('common.file') : translate('common.folder');
    if (!window.confirm(translate('confirmations.confirmDeleteItem', { itemType, name: item.name }))) return;
    
    const token = localStorage.getItem("token");
    
    try {
      let res;
      
      if (item.type === 'file') {
        // Delete file
        res = await fetch(`/api/files/${itemId}/delete`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Delete folder
        res = await fetch(`/api/folders?id=${itemId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(translate('errors.deleteFailed', { itemType, error: data.error || 'Unknown error' }));
        return;
      }
      
      // Refresh list after successful deletion
      fetchItems(currentFolder);
      
      // Refresh folder tree if deleting folder
      if (item.type === 'folder') {
        fetchFolderTree();
      }
      
    } catch (error) {
      console.error('Delete error:', error);
      alert(translate('errors.deleteFailedGeneric', { itemType }));
    }
  };

  return {
    items,
    setItems,
    selectedItems,
    setSelectedItems,
    enableMultiSelect,
    setEnableMultiSelect,
    dragSelecting,
    setDragSelecting,
    dragStart,
    setDragStart,
    dragEnd,
    setDragEnd,
    dragBoxRef,
    currentFolder,
    setCurrentFolder,
    loading,
    setLoading,
    error,
    setError,
    uploading,
    setUploading,
    creatingFolder,
    setCreatingFolder,
    newFolderName,
    setNewFolderName,
    fileInputRef,
    fileTitleRef,
    renaming,
    setRenaming,
    renameInputRef,
    contextMenu,
    setContextMenu,
    folderTree,
    setFolderTree,
    isSelected,
    handleSelect,
    handleSelectAll,
    fetchItems,
    fetchFolders: fetchFolderTree,
    handleUpload,
    handleDownload,
    handleDelete,
    breadcrumb,
  };
}
