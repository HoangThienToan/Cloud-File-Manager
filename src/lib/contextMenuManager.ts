import { FileService } from './fileService';
import { Item } from '../components/types';
import { StateManager } from './stateManager';
import { globalStateManager } from './globalStateManager';

export interface ContextMenuAction {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
  color?: string;
}

export class ContextMenuManager {
  private onRefresh: () => void;
  private onError: (message: string) => void;
  private onSuccess: (message: string, description?: string) => void;
  private onRename: (item: Item) => void;
  private t: (key: string) => string;
  private onShowModal: (modalType: string, data: any) => void;
  private stateManager: StateManager;

  constructor(
    onRefresh: () => void,
    onError: (message: string) => void,
    onSuccess: (message: string, description?: string) => void,
    onRename: (item: Item) => void,
    onShowModal: (modalType: string, data: any) => void,
    stateManager: StateManager,
    t: (key: string) => string
  ) {
    this.onRefresh = onRefresh;
    this.onError = onError;
    this.onSuccess = onSuccess;
    this.onRename = onRename;
    this.onShowModal = onShowModal;
    this.stateManager = stateManager;
    this.t = t;
  }

  // Get context menu for single file
  getFileContextMenu(file: Item): ContextMenuAction[] {
    const isZipFile = file.name.toLowerCase().endsWith('.zip');
    
    return [
      {
        label: this.t('common.open'),
        icon: '👁️',
        onClick: () => this.openFile(file),
      },
      {
        label: this.t('common.download'),
        icon: '📥',
        onClick: () => this.downloadFile(file),
      },
      {
        label: this.t('common.getURL'),
        icon: '🔗',
        onClick: () => this.showFileURLs(file),
      },
      {
        label: '',
        icon: '',
        onClick: () => {},
        separator: true,
      },
      {
        label: this.t('common.rename'),
        icon: '✏️',
        onClick: () => this.onRename(file),
      },
      {
        label: this.t('common.copy'),
        icon: '📋',
        onClick: () => this.copyFile(file),
      },
      {
        label: this.t('common.move'),
        icon: '📁',
        onClick: () => this.moveFile(file),
      },
      ...(isZipFile ? [{
        label: this.t('common.extract'),
        icon: '📦',
        onClick: () => this.extractFile(file),
      }] : []),
      {
        label: '',
        icon: '',
        onClick: () => {},
        separator: true,
      },
      {
        label: this.t('common.share'),
        icon: '🔗',
        onClick: () => this.shareFile(file),
      },
      {
        label: this.t('common.info'),
        icon: 'ℹ️',
        onClick: () => this.showFileInfo(file),
      },
      {
        label: '',
        icon: '',
        onClick: () => {},
        separator: true,
      },
      {
        label: this.t('common.delete'),
        icon: '🗑️',
        onClick: () => this.deleteFile(file),
        danger: true,
      },
    ];
  }

  // Get context menu for single folder
  getFolderContextMenu(folder: Item): ContextMenuAction[] {
    return [
      {
        label: this.t('common.open'),
        icon: '📂',
        onClick: () => this.openFolder(folder),
      },
      {
        label: '',
        icon: '',
        onClick: () => {},
        separator: true,
      },
      {
        label: this.t('common.rename'),
        icon: '✏️',
        onClick: () => this.onRename(folder),
      },
      {
        label: this.t('common.copy'),
        icon: '📋',
        onClick: () => this.copyFolder(folder),
      },
      {
        label: this.t('common.move'),
        icon: '📁',
        onClick: () => this.moveFolder(folder),
      },
      {
        label: '',
        icon: '',
        onClick: () => {},
        separator: true,
      },
      {
        label: this.t('common.delete'),
        icon: '🗑️',
        onClick: () => this.deleteFolder(folder),
        danger: true,
      },
    ];
  }

  // Get context menu for multiple items
  getMultipleItemsContextMenu(items: Item[]): ContextMenuAction[] {
    const hasFiles = items.some(item => item.type === 'file');
    const hasFolders = items.some(item => item.type === 'folder');
    const fileIds = items.filter(item => item.type === 'file').map(item => item.id);

    return [
      {
        label: `Đã chọn ${items.length} mục`,
        icon: '✅',
        onClick: () => {},
        disabled: true,
      },
      {
        label: '',
        icon: '',
        onClick: () => {},
        separator: true,
      },
      ...(hasFiles ? [{
        label: 'Tải xuống tất cả',
        icon: '📥',
        onClick: () => this.downloadMultipleFiles(items.filter(item => item.type === 'file')),
      }] : []),
      {
        label: 'Di chuyển',
        icon: '📁',
        onClick: () => this.moveMultipleItems(items),
      },
      {
        label: this.t('common.copy'),
        icon: '📋',
        onClick: () => this.copyMultipleItems(items),
      },
      ...(hasFiles && fileIds.length > 1 ? [{
        label: this.t('common.zipCreate'),
        icon: '🗜️',
        onClick: () => this.compressFiles(fileIds),
      }] : []),
      {
        label: '',
        icon: '',
        onClick: () => {},
        separator: true,
      },
      {
        label: 'Xóa tất cả',
        icon: '🗑️',
        onClick: () => this.deleteMultipleItems(items),
        danger: true,
      },
    ];
  }

  // Individual actions
  private async openFile(file: Item) {
    try {
      // Lấy bucket của user (ưu tiên bucket đầu tiên)
      const userBucket = await this.getUserDefaultBucket()
      
      if (userBucket) {
        // Tạo clean URL với bucket
        const bucketUrl = `${window.location.origin}/${userBucket.name}/${file.name}`
        window.open(bucketUrl, '_blank')
        this.onSuccess('Đã mở tệp', `Using bucket: ${userBucket.name}`)
      } else {
        // Fallback về URL cũ nếu chưa có bucket
        const publicUrl = `/api/file-public?id=${file.id}`
        window.open(publicUrl, '_blank')
        this.onSuccess('Đã mở tệp', file.name)
      }
    } catch (error) {
      console.error('Open file error:', error)
      this.onError('Không thể mở tệp')
    }
  }

  private async getUserDefaultBucket() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/buckets', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.buckets[0] // Lấy bucket đầu tiên làm default
      }
    } catch (error) {
      console.error('Failed to get user bucket:', error)
    }
    return null
  }

  private async downloadFile(file: Item) {
    try {
      await FileService.downloadFile(file.id, file.name);
      this.onSuccess('Tải xuống thành công', file.name);
    } catch (error) {
      this.onError('Tải xuống thất bại');
    }
  }

  private showFileURLs(file: Item) {
    console.log('🔗 showFileURLs called for file:', file.name, file.id);
    // Show modal with file URLs
    this.onShowModal('fileURLs', { fileId: file.id, fileName: file.name });
    console.log('🔗 Modal trigger sent:', { fileId: file.id, fileName: file.name });
  }

  private async deleteFile(file: Item) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tệp "${file.name}"?`)) return;
    
    // Optimistically remove from file table only
    globalStateManager.updateFileTable('delete', [file]);
    
    try {
      await FileService.deleteFile(file.id);
      this.onSuccess('Đã xóa tệp', file.name);
      // No need to refresh - already removed optimistically
    } catch (error) {
      this.onError('Xóa tệp thất bại');
      // Revert optimistic update by refreshing file table only
      globalStateManager.refreshComponent('file-table');
    }
  }

  private async deleteFolder(folder: Item) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thư mục "${folder.name}"?`)) return;
    
    // Optimistically remove from both table and tree
    globalStateManager.updateBoth('delete', [folder]);
    
    try {
      await FileService.deleteFolder(folder.id);
      this.onSuccess('Đã xóa thư mục', folder.name);
      // No need to refresh - already removed optimistically
    } catch (error) {
      this.onError('Xóa thư mục thất bại');
      // Revert optimistic update by refreshing both components
      globalStateManager.refreshComponent('file-table');
      globalStateManager.refreshComponent('folder-tree');
    }
  }

  private openFolder(folder: Item) {
    // This should trigger navigation to the folder
    if (typeof window !== 'undefined' && (window as any).navigateToFolder) {
      (window as any).navigateToFolder(folder.id);
    }
  }

  private copyFile(file: Item) {
    this.onShowModal('folderPicker', {
      title: 'Sao chép tệp',
      confirmText: this.t('common.copy'),
      items: [file],
      action: 'copy'
    });
  }

  private copyFolder(folder: Item) {
    this.onShowModal('folderPicker', {
      title: 'Sao chép thư mục',
      confirmText: this.t('common.copy'),
      items: [folder],
      action: 'copy'
    });
  }

  private moveFile(file: Item) {
    this.onShowModal('folderPicker', {
      title: 'Di chuyển tệp',
      confirmText: 'Di chuyển',
      items: [file],
      action: 'move',
      onConfirm: (targetFolderId: string | null) => this.handleMoveAction([file], targetFolderId)
    });
  }

  private moveFolder(folder: Item) {
    this.onShowModal('folderPicker', {
      title: 'Di chuyển thư mục',
      confirmText: 'Di chuyển',
      items: [folder],
      action: 'move',
      onConfirm: (targetFolderId: string | null) => this.handleMoveAction([folder], targetFolderId)
    });
  }

  private async extractFile(file: Item) {
    try {
      const result = await FileService.extractFile(file.id, null);
      this.onSuccess('Giải nén thành công', `Đã giải nén ${result.files.length} tệp`);
      
      // Add extracted files to file table only
      if (result.files) {
        globalStateManager.updateFileTable('add', result.files);
      } else {
        globalStateManager.refreshComponent('file-table');
      }
    } catch (error) {
      this.onError('Giải nén thất bại');
    }
  }

  private async shareFile(file: Item) {
    try {
      const shareUrl = await FileService.createShareLink(file.id);
      await navigator.clipboard.writeText(shareUrl);
      this.onSuccess('Liên kết chia sẻ đã được sao chép', 'Paste để chia sẻ với người khác');
    } catch (error) {
      this.onError('Tạo liên kết chia sẻ thất bại');
    }
  }

  private async showFileInfo(file: Item) {
    try {
      const info = await FileService.getFileInfo(file.id);
      alert(`Thông tin tệp:\nTên: ${info.name}\nKích thước: ${info.size}\nTạo: ${new Date(info.createdAt).toLocaleString()}`);
    } catch (error) {
      this.onError('Không thể lấy thông tin tệp');
    }
  }

  // Multiple items actions
  private async downloadMultipleFiles(files: Item[]) {
    for (const file of files) {
      try {
        await FileService.downloadFile(file.id, file.name);
      } catch (error) {
        console.error(`Failed to download ${file.name}`);
      }
    }
    this.onSuccess('Tải xuống hoàn tất', `Đã tải ${files.length} tệp`);
  }

  private moveMultipleItems(items: Item[]) {
    this.onShowModal('folderPicker', {
      title: `Di chuyển ${items.length} mục`,
      confirmText: 'Di chuyển',
      items,
      action: 'move',
      onConfirm: (targetFolderId: string | null) => this.handleMoveAction(items, targetFolderId)
    });
  }

  private copyMultipleItems(items: Item[]) {
    this.onShowModal('folderPicker', {
      title: `Sao chép ${items.length} mục`,
      confirmText: this.t('common.copy'),
      items,
      action: 'copy'
    });
  }

  private async compressFiles(fileIds: string[]) {
    const zipName = window.prompt('Tên file ZIP:', 'archive.zip');
    if (!zipName) return;

    try {
      const result = await FileService.compressFiles(fileIds, zipName);
      this.onSuccess('Nén thành công', `Đã tạo ${result.file.name}`);
      
      // Add zip file to file table only
      globalStateManager.updateFileTable('add', [result.file]);
    } catch (error) {
      this.onError('Nén tệp thất bại');
    }
  }

  private async deleteMultipleItems(items: Item[]) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${items.length} mục đã chọn?`)) return;

    // Optimistically remove from appropriate components
    const files = items.filter(item => item.type === 'file');
    const folders = items.filter(item => item.type === 'folder');
    
    if (files.length > 0) {
      globalStateManager.updateFileTable('delete', files);
    }
    if (folders.length > 0) {
      globalStateManager.updateBoth('delete', folders);
    }

    try {
      // Delete files
      for (const file of files) {
        await FileService.deleteFile(file.id);
      }

      // Delete folders
      for (const folder of folders) {
        await FileService.deleteFolder(folder.id);
      }

      this.onSuccess('Xóa thành công', `Đã xóa ${items.length} mục`);
      // No need to refresh - already removed optimistically
    } catch (error) {
      this.onError('Xóa thất bại');
      // Revert optimistic update by refreshing relevant components
      globalStateManager.refreshComponent('file-table');
      if (folders.length > 0) {
        globalStateManager.refreshComponent('folder-tree');
      }
    }
  }

  // Handle move action after user selects target folder
  async handleMoveAction(items: Item[], targetFolderId: string | null) {
    try {
      const itemIds = items.map(item => item.id);
      
      // Optimistically remove items from current view
      globalStateManager.updateFileTable('move', items, targetFolderId);
      
      // If moving folders, also update folder tree
      const folders = items.filter(item => item.type === 'folder');
      if (folders.length > 0) {
        globalStateManager.updateFolderTree('move', folders);
      }

      // Call the actual move API
      await FileService.moveItems(itemIds, targetFolderId);
      
      const targetName = targetFolderId ? 'thư mục đích' : 'thư mục gốc';
      this.onSuccess('Di chuyển thành công', `Đã di chuyển ${items.length} mục đến ${targetName}`);
      
    } catch (error) {
      this.onError('Di chuyển thất bại');
      // Revert optimistic update by refreshing components
      globalStateManager.refreshComponent('file-table');
      if (items.some(item => item.type === 'folder')) {
        globalStateManager.refreshComponent('folder-tree');
      }
    }
  }
}
