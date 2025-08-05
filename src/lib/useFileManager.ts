import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { globalStateManager } from "./globalStateManager";
import { useToast } from "../components/ToastProvider";

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
    { id: null, name: '🏠 Trang chủ' }
  ]);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const lastFetchRef = useRef<string | null>(null);

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
      if (!res.ok) setError(data.error || "Không lấy được danh sách");
      else {
        const folders: Item[] = (data.folders || []).map((f: FolderItem) => ({ ...f, type: 'folder' }));
        const files: Item[] = (data.files || []).map((f: FileItem) => ({ ...f, type: 'file', path: f.path }));
        setItems([...folders, ...files]);
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
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
      return [{ id: null, name: '🏠 Trang chủ' }];
    }
    
    // Build breadcrumb path from folderTree
    const buildBreadcrumb = (folderId: string | null, tree: any[], path: Array<{ id: string | null; name: string }> = []): Array<{ id: string | null; name: string }> => {
      if (folderId === null) {
        return [{ id: null, name: '🏠 Trang chủ' }, ...path];
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
      return [{ id: null, name: '🏠 Trang chủ' }, ...path];
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
      setError('Đã có thư mục cùng tên trong thư mục này!');
      return;
    }
    const existsFile = items.some(
      (item) => item.name.trim().toLowerCase() === fileName.trim().toLowerCase() && item.type === 'file'
    );
    if (existsFile) {
      setError('Đã có tệp cùng tên trong thư mục này!');
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
        if (data.error?.includes('thư mục cùng tên')) {
          const errorMsg = 'Đã có thư mục cùng tên trong thư mục này!';
          setError(errorMsg);
          toast.error('Upload thất bại', errorMsg);
        }
        else if (data.error?.includes('tệp cùng tên')) {
          const errorMsg = 'Đã có tệp cùng tên trong thư mục này!';
          setError(errorMsg);
          toast.error('Upload thất bại', errorMsg);
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
          
          const userFriendlyError = `Tệp "${fileName}" không được phép tải lên!`;
          const detailedError = `Chi tiết:\n• Loại tệp: ${fileType}\n• Phần mở rộng: .${fileExt}\n\nCác loại tệp được phép: PDF, PNG, JPG, JPEG, GIF, WEBP, TXT, CSV, DOC, DOCX, XLS, XLSX, ZIP, RAR, 7Z, TAR, GZ, PPT, PPTX, MD\n\nLưu ý: Các tệp thực thi (.exe, .bat, .sh, .msi, .dll) và script (.js, .php, .py) không được phép vì lý do bảo mật.`;
          
          setError(userFriendlyError);
          toast.error('Loại tệp không được phép', detailedError);
        }
        else {
          const errorMsg = data.error || "Upload thất bại";
          setError(errorMsg);
          toast.error('Upload thất bại', errorMsg);
        }
      } else {
        setError(""); // Clear any previous errors
        toast.success('Upload thành công', `Tệp "${fileInputRef.current.files[0].name}" đã được tải lên thành công!`);
        fetchItems(currentFolder);
      }
    } catch {
      const errorMsg = "Lỗi upload file";
      setError(errorMsg);
      toast.error('Lỗi kết nối', 'Không thể kết nối đến server. Vui lòng thử lại sau.');
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
      alert("Không tải được file");
    }
  };

  const handleDelete = async (itemId: string) => {
    // Tìm item để xác định type
    const item = items.find(i => i.id === itemId);
    if (!item) {
      alert('Không tìm thấy item để xóa');
      return;
    }
    
    const itemType = item.type === 'file' ? (t?.('common.file') || 'file') : (t?.('common.folder') || 'folder');
    if (!window.confirm(`Bạn chắc chắn muốn xóa ${itemType} "${item.name}" này?`)) return;
    
    const token = localStorage.getItem("token");
    
    try {
      let res;
      
      if (item.type === 'file') {
        // Xóa file
        res = await fetch(`/api/files/${itemId}/delete`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Xóa folder
        res = await fetch(`/api/folders?id=${itemId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(`Xóa ${itemType} thất bại: ${data.error || 'Unknown error'}`);
        return;
      }
      
      // Refresh danh sách sau khi xóa thành công
      fetchItems(currentFolder);
      
      // Nếu xóa folder thì cũng cần refresh folder tree
      if (item.type === 'folder') {
        fetchFolderTree();
      }
      
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Xóa ${itemType} thất bại: Có lỗi xảy ra`);
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
