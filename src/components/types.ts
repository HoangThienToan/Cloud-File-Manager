import React from "react";

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
