import { translate } from './i18n';

// Backend service for file/folder operations
export class FileService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  // Download file
  static async downloadFile(fileId: string, fileName: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const downloadUrl = `/api/files/${fileId}/download?token=${encodeURIComponent(token || '')}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error(translate('errors.downloadFailed'));
    }
  }

  // Rename file
  static async renameFile(fileId: string, newName: string): Promise<any> {
    try {
      const response = await fetch(`/api/files/${fileId}/rename`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('renameFailed'));
      }
      return data;
    } catch (error) {
      console.error('Rename file failed:', error);
      throw error;
    }
  }

  // Rename folder
  static async renameFolder(folderId: string, newName: string): Promise<any> {
    try {
      const response = await fetch('/api/folders', {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ id: folderId, name: newName.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('renameFailed'));
      }
      return data;
    } catch (error) {
      console.error('Rename folder failed:', error);
      throw error;
    }
  }

  // Delete file
  static async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`/api/files/${fileId}/delete`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('deleteFileFailed'));
      }
    } catch (error) {
      console.error('Delete file failed:', error);
      throw error;
    }
  }

  // Delete folder
  static async deleteFolder(folderId: string): Promise<void> {
    try {
      const response = await fetch(`/api/folders?id=${folderId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('deleteFolderFailed'));
      }
    } catch (error) {
      console.error('Delete folder failed:', error);
      throw error;
    }
  }

  // Move files/folders
  static async moveItems(itemIds: string[], targetFolderId: string | null): Promise<void> {
    console.log('MOVE ITEMS:', { itemIds, targetFolderId });
    
    try {
      const response = await fetch('/api/bulk', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ 
          action: 'move',
          itemIds, 
          targetFolderId 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('moveFailed'));
      }
    } catch (error) {
      console.error('Move items failed:', error);
      throw error;
    }
  }

  // Copy files/folders
  static async copyItems(itemIds: string[], targetFolderId: string | null): Promise<void> {
    try {
      const response = await fetch('/api/bulk', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ 
          action: 'copy',
          itemIds, 
          targetFolderId 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('copyFailed'));
      }
    } catch (error) {
      console.error('Copy items failed:', error);
      throw error;
    }
  }

  // Compress files into ZIP
  static async compressFiles(fileIds: string[], zipName: string): Promise<any> {
    try {
      const response = await fetch('/api/files/compress', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ fileIds, zipName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('compressFailed'));
      }
      return data;
    } catch (error) {
      console.error('Compress files failed:', error);
      throw error;
    }
  }

  // Extract ZIP file
  static async extractFile(fileId: string, folderId: string | null): Promise<any> {
    try {
      const response = await fetch('/api/files/extract', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ fileId, folderId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('extractFailed'));
      }
      return data;
    } catch (error) {
      console.error('Extract file failed:', error);
      throw error;
    }
  }

  // Create shareable link
  static async createShareLink(fileId: string, expiresIn?: number): Promise<string> {
    try {
      const response = await fetch('/api/files/share', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ fileId, expiresIn }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('createShareLinkFailed'));
      }
      return data.shareUrl;
    } catch (error) {
      console.error('Create share link failed:', error);
      throw error;
    }
  }

  // Get file info
  static async getFileInfo(fileId: string): Promise<any> {
    try {
      const response = await fetch(`/api/files/${fileId}/info`, {
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || translate('getFileInfoFailed'));
      }
      return data;
    } catch (error) {
      console.error('Get file info failed:', error);
      throw error;
    }
  }
}
