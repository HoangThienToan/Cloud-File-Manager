import { Item } from '../components/types';

export interface StateUpdate {
  type: 'add' | 'update' | 'delete' | 'move';
  items: Item[];
  targetFolderId?: string | null;
  sourceItems?: Item[];
}

export class StateManager {
  private updateCallback: (update: StateUpdate) => void;

  constructor(updateCallback: (update: StateUpdate) => void) {
    this.updateCallback = updateCallback;
  }

  // Add new items (after upload, extract, compress)
  addItems(items: Item[]) {
    this.updateCallback({
      type: 'add',
      items
    });
  }

  // Update existing items (after rename)
  updateItems(items: Item[]) {
    this.updateCallback({
      type: 'update',
      items
    });
  }

  // Delete items (after delete operation)
  deleteItems(items: Item[]) {
    this.updateCallback({
      type: 'delete',
      items
    });
  }

  // Move items (after move/cut operation)
  moveItems(sourceItems: Item[], targetFolderId: string | null) {
    this.updateCallback({
      type: 'move',
      items: [],
      targetFolderId,
      sourceItems
    });
  }

  // Optimistically update item in current view
  optimisticUpdate(itemId: string, updates: Partial<Item>) {
    this.updateCallback({
      type: 'update',
      items: [{ id: itemId, ...updates } as Item]
    });
  }

  // Optimistically remove item from current view
  optimisticDelete(items: Item[]) {
    this.updateCallback({
      type: 'delete',
      items
    });
  }

  // Add new zip file after compression
  updateAfterZipCreation(zipFile: Item) {
    this.updateCallback({
      type: 'add',
      items: [zipFile]
    });
  }

  // Add extracted files after ZIP extraction
  updateAfterExtract(extractedFiles: Item[]) {
    this.updateCallback({
      type: 'add',
      items: extractedFiles
    });
  }
}
