import { FileService } from './fileService';
import { Item } from '../components/types';
import { StateManager } from './stateManager';
import { globalStateManager } from './globalStateManager';
import { translate } from './i18n';

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
        label: translate('selectedItems', { count: items.length }),
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
        label: translate('moveButton'),
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
        label: translate('deleteAll'),
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
        // Create clean URL with bucket
        const bucketUrl = `${window.location.origin}/${userBucket.name}/${file.name}`
        window.open(bucketUrl, '_blank')
        this.onSuccess(translate('fileOpened'), translate('usingBucket', { bucketName: userBucket.name }))
      } else {
        // Fallback về URL cũ nếu chưa có bucket
        const publicUrl = `/api/file-public?id=${file.id}`
        window.open(publicUrl, '_blank')
        this.onSuccess(translate('fileOpened'), file.name)
      }
    } catch (error) {
      console.error('Open file error:', error)
      this.onError(translate('cannotOpenFile'))
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
      this.onSuccess(translate('downloadSuccess'), file.name);
    } catch (error) {
      this.onError(translate('downloadFailed'));
    }
  }

  private showFileURLs(file: Item) {
    console.log('🔗 showFileURLs called for file:', file.name, file.id);
    // Show modal with file URLs
    this.onShowModal('fileURLs', { fileId: file.id, fileName: file.name });
    console.log('🔗 Modal trigger sent:', { fileId: file.id, fileName: file.name });
  }

  private async deleteFile(file: Item) {
    if (!window.confirm(translate('confirmDeleteFile', { fileName: file.name }))) return;
    
    // Optimistically remove from file table only
    globalStateManager.updateFileTable('delete', [file]);
    
    try {
      await FileService.deleteFile(file.id);
      this.onSuccess(translate('fileDeleted'), file.name);
      // No need to refresh - already removed optimistically
    } catch (error) {
      this.onError(translate('deleteFileFailed'));
      // Revert optimistic update by refreshing file table only
      globalStateManager.refreshComponent('file-table');
    }
  }

  private async deleteFolder(folder: Item) {
    if (!window.confirm(translate('confirmDeleteFolder', { folderName: folder.name }))) return;
    
    // Optimistically remove from both table and tree
    globalStateManager.updateBoth('delete', [folder]);
    
    try {
      await FileService.deleteFolder(folder.id);
      this.onSuccess(translate('folderDeleted'), folder.name);
      // No need to refresh - already removed optimistically
    } catch (error) {
      this.onError(translate('deleteFolderFailed'));
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
      title: translate('copyFileTitle'),
      confirmText: this.t('common.copy'),
      items: [file],
      action: 'copy'
    });
  }

  private copyFolder(folder: Item) {
    this.onShowModal('folderPicker', {
      title: translate('copyFolderTitle'),
      confirmText: this.t('common.copy'),
      items: [folder],
      action: 'copy'
    });
  }

  private moveFile(file: Item) {
    this.onShowModal('folderPicker', {
      title: translate('moveFileTitle'),
      confirmText: translate('moveButton'),
      items: [file],
      action: 'move',
      onConfirm: (targetFolderId: string | null) => this.handleMoveAction([file], targetFolderId)
    });
  }

  private moveFolder(folder: Item) {
    this.onShowModal('folderPicker', {
      title: translate('moveFolderTitle'),
      confirmText: translate('moveButton'),
      items: [folder],
      action: 'move',
      onConfirm: (targetFolderId: string | null) => this.handleMoveAction([folder], targetFolderId)
    });
  }

  private async extractFile(file: Item) {
    try {
      const result = await FileService.extractFile(file.id, null);
      this.onSuccess(translate('extractSuccess'), translate('extractedFiles', { count: result.files.length }));
      
      // Add extracted files to file table only
      if (result.files) {
        globalStateManager.updateFileTable('add', result.files);
      } else {
        globalStateManager.refreshComponent('file-table');
      }
    } catch (error) {
      this.onError(translate('extractFailedError'));
    }
  }

  private async shareFile(file: Item) {
    try {
      const shareUrl = await FileService.createShareLink(file.id);
      await navigator.clipboard.writeText(shareUrl);
      this.onSuccess(translate('shareLinkCopied'), translate('shareLinkPasteHint'));
    } catch (error) {
      this.onError(translate('createShareLinkFailedError'));
    }
  }

  private async showFileInfo(file: Item) {
    try {
      const info = await FileService.getFileInfo(file.id);
      alert(translate('fileInfoAlert', { name: info.name, size: info.size, created: new Date(info.createdAt).toLocaleString() }));
    } catch (error) {
      this.onError(translate('getFileInfoFailedError'));
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
    this.onSuccess(translate('downloadComplete'), translate('downloadedFiles', { count: files.length }));
  }

  private moveMultipleItems(items: Item[]) {
    this.onShowModal('folderPicker', {
      title: translate('moveMultipleTitle', { count: items.length }),
      confirmText: translate('moveButton'),
      items,
      action: 'move',
      onConfirm: (targetFolderId: string | null) => this.handleMoveAction(items, targetFolderId)
    });
  }

  private copyMultipleItems(items: Item[]) {
    this.onShowModal('folderPicker', {
      title: translate('copyMultipleTitle', { count: items.length }),
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
      this.onSuccess(translate('compressSuccess'), translate('compressedFile', { fileName: result.file.name }));
      
      // Add zip file to file table only
      globalStateManager.updateFileTable('add', [result.file]);
    } catch (error) {
      this.onError(translate('compressFailedError'));
    }
  }

  private async deleteMultipleItems(items: Item[]) {
    if (!window.confirm(translate('confirmDeleteMultiple', { count: items.length }))) return;

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

      this.onSuccess(translate('deleteMultipleSuccess'), translate('deletedMultipleItems', { count: items.length }));
      // No need to refresh - already removed optimistically
    } catch (error) {
      this.onError(translate('deleteMultipleFailed'));
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
      
      const targetName = targetFolderId ? translate('targetFolder') : translate('rootFolder');
      this.onSuccess(translate('moveMultipleSuccess'), translate('movedMultipleItems', { count: items.length, target: targetName }));
      
    } catch (error) {
      this.onError(translate('moveMultipleFailed'));
      // Revert optimistic update by refreshing components
      globalStateManager.refreshComponent('file-table');
      if (items.some(item => item.type === 'folder')) {
        globalStateManager.refreshComponent('folder-tree');
      }
    }
  }
}
