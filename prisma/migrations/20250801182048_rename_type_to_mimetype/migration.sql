/*
  Warnings:

  - Renamed column `type` to `mimeType` on the `files` table to maintain data consistency.

*/
-- Rename the type column to mimeType
ALTER TABLE "files" RENAME COLUMN "type" TO "mimeType";
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "folderId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_files" ("createdAt", "folderId", "id", "name", "originalName", "path", "size", "storageName", "updatedAt", "userId") SELECT "createdAt", "folderId", "id", "name", "originalName", "path", "size", "storageName", "updatedAt", "userId" FROM "files";
DROP TABLE "files";
ALTER TABLE "new_files" RENAME TO "files";
CREATE INDEX "files_userId_folderId_idx" ON "files"("userId", "folderId");
CREATE INDEX "files_userId_name_idx" ON "files"("userId", "name");
CREATE INDEX "files_mimeType_idx" ON "files"("mimeType");
CREATE INDEX "files_size_idx" ON "files"("size");
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
