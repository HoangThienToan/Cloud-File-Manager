"use client";

import React from "react";
import { ThemeProvider } from "../components/ThemeProvider";
import { ToastProvider } from "../components/ToastProvider";
import ErrorBoundary from "../components/ErrorBoundary";
import { useFileManager } from "../lib/useFileManager";
// Fixed import path
import FileManagerLayout from "../components/FileManagerLayout";
import AppLayout from "../components/AppLayout";

export default function HomePage() {
  const fileManager = useFileManager();

  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AppLayout>
            <FileManagerLayout
              renderContextMenu={() => null}
              folderTree={fileManager.folderTree}
              currentFolder={fileManager.currentFolder}
              setCurrentFolder={fileManager.setCurrentFolder}
              creatingFolder={fileManager.creatingFolder}
              setCreatingFolder={fileManager.setCreatingFolder}
              newFolderName={fileManager.newFolderName}
              setNewFolderName={fileManager.setNewFolderName}
              items={fileManager.items}
              setError={fileManager.setError}
              fetchItems={fileManager.fetchItems}
              enableMultiSelect={fileManager.enableMultiSelect}
              setEnableMultiSelect={fileManager.setEnableMultiSelect}
              dragSelecting={fileManager.dragSelecting}
              setDragSelecting={fileManager.setDragSelecting}
              dragStart={fileManager.dragStart}
              setDragStart={fileManager.setDragStart}
              dragEnd={fileManager.dragEnd}
              setDragEnd={fileManager.setDragEnd}
              dragBoxRef={fileManager.dragBoxRef}
              loading={fileManager.loading}
              error={fileManager.error}
              uploading={fileManager.uploading}
              selectedItems={fileManager.selectedItems}
              setSelectedItems={fileManager.setSelectedItems}
              isSelected={fileManager.isSelected}
              handleSelect={fileManager.handleSelect}
              handleSelectAll={fileManager.handleSelectAll}
              fileInputRef={fileManager.fileInputRef}
              fileTitleRef={fileManager.fileTitleRef}
              renaming={fileManager.renaming}
              setRenaming={fileManager.setRenaming}
              renameInputRef={fileManager.renameInputRef}
              handleUpload={fileManager.handleUpload}
              handleDelete={fileManager.handleDelete}
              setContextMenu={fileManager.setContextMenu}
            />
          </AppLayout>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}
