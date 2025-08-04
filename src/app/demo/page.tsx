// Demo page to test GlobalStateManager
"use client";

import React from "react";
import { ThemeProvider } from "../../components/ThemeProvider";
import { ToastProvider } from "../../components/ToastProvider";
import ErrorBoundary from "../../components/ErrorBoundary";
import { useFileManager } from "../../lib/useFileManager";
import FileManagerLayoutNew from "../../components/FileManagerLayoutNew";
import ContextMenu from "../../components/ContextMenu";
import AppLayout from "../../components/AppLayout";

export default function DemoPage() {
  const fileManager = useFileManager();
  const [contextMenu, setContextMenu] = React.useState<any>(null);

  // Setup global navigation function for context menu
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).navigateToFolder = (folderId: string | null) => {
        fileManager.setCurrentFolder(folderId);
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).navigateToFolder = undefined;
      }
    };
  }, [fileManager.setCurrentFolder]);

  if (fileManager.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AppLayout 
            currentPath={fileManager.currentFolder ? "Demo - Thư mục con" : "Demo - Trang chủ"}
            onUpload={() => {
              if (fileManager.fileInputRef.current) {
                fileManager.fileInputRef.current.click();
              }
            }}
            breadcrumb={fileManager.breadcrumb}
          >
            <FileManagerLayoutNew
              renderContextMenu={() => (
                contextMenu && (
                  <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                  />
                )
              )}
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
              fetchFolderTree={fileManager.fetchFolderTree}
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
              handleUpload={fileManager.handleUpload}
              fileInputRef={fileManager.fileInputRef}
              fileTitleRef={fileManager.fileTitleRef}
              selectedItems={fileManager.selectedItems}
              setSelectedItems={fileManager.setSelectedItems}
              isSelected={fileManager.isSelected}
              handleSelect={fileManager.handleSelect}
              handleSelectAll={fileManager.handleSelectAll}
              renaming={fileManager.renaming}
              setRenaming={fileManager.setRenaming}
              renameInputRef={fileManager.renameInputRef}
              handleDelete={fileManager.handleDelete}
              setContextMenu={setContextMenu}
              breadcrumb={fileManager.breadcrumb}
            />

            <input
              ref={fileManager.fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={fileManager.handleUpload}
            />
          </AppLayout>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}
