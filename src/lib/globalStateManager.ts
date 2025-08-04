import { Item } from '../components/types';

export interface GlobalStateUpdate {
  type: 'folder-tree' | 'file-table' | 'breadcrumb' | 'all';
  action: 'add' | 'update' | 'delete' | 'move' | 'refresh';
  data?: {
    items?: Item[];
    folderId?: string | null;
    targetFolderId?: string | null;
    sourceItems?: Item[];
    breadcrumbPath?: Array<{ id: string | null; name: string }>;
  };
}

type StateUpdateCallback = (update: GlobalStateUpdate) => void;

export class GlobalStateManager {
  private static instance: GlobalStateManager;
  private callbacks: Map<string, StateUpdateCallback> = new Map();
  
  static getInstance(): GlobalStateManager {
    if (!GlobalStateManager.instance) {
      GlobalStateManager.instance = new GlobalStateManager();
    }
    return GlobalStateManager.instance;
  }

  // Register component for updates
  subscribe(componentId: string, callback: StateUpdateCallback) {
    this.callbacks.set(componentId, callback);
    return () => {
      this.callbacks.delete(componentId);
    };
  }

  // Emit update to specific component types
  private emit(update: GlobalStateUpdate) {
    this.callbacks.forEach((callback, componentId) => {
      // Only update relevant components
      if (update.type === 'all' || 
          componentId.startsWith(update.type) ||
          (update.type === 'folder-tree' && componentId.includes('tree')) ||
          (update.type === 'file-table' && componentId.includes('table')) ||
          (update.type === 'breadcrumb' && componentId.includes('breadcrumb'))) {
        callback(update);
      }
    });
  }

  // File/Folder operations that affect file table
  updateFileTable(action: 'add' | 'update' | 'delete' | 'move', items: Item[], targetFolderId?: string | null) {
    this.emit({
      type: 'file-table',
      action,
      data: { items, targetFolderId }
    });
  }

  // Folder operations that affect folder tree
  updateFolderTree(action: 'add' | 'update' | 'delete' | 'move', items: Item[]) {
    this.emit({
      type: 'folder-tree',
      action,
      data: { items }
    });
  }

  // Navigation that affects breadcrumb
  updateBreadcrumb(breadcrumbPath: Array<{ id: string | null; name: string }>) {
    this.emit({
      type: 'breadcrumb',
      action: 'update',
      data: { breadcrumbPath }
    });
  }

  // Operations that affect both table and tree
  updateBoth(action: 'add' | 'update' | 'delete' | 'move', items: Item[], targetFolderId?: string | null) {
    // Update file table
    this.updateFileTable(action, items, targetFolderId);
    
    // If folder operations, also update folder tree
    const folders = items.filter(item => item.type === 'folder');
    if (folders.length > 0) {
      this.updateFolderTree(action, folders);
    }
  }

  // Force refresh specific component
  refreshComponent(type: 'folder-tree' | 'file-table' | 'breadcrumb') {
    this.emit({
      type,
      action: 'refresh'
    });
  }

  // Emergency full refresh (avoid using this)
  refreshAll() {
    this.emit({
      type: 'all',
      action: 'refresh'
    });
  }
}

export const globalStateManager = GlobalStateManager.getInstance();
