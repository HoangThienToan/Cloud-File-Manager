/*
  Warnings:

  - You are about to drop the column `mimeType` on the `files` table. All the data in the column will be lost.
  - Added the required column `type` to the `files` table without a default value. This is not possible if the table is not empty.
  - Made the column `storageName` on table `files` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "folderId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_files" ("createdAt", "folderId", "id", "name", "originalName", "path", "size", "storageName", "updatedAt", "userId", "type") SELECT "createdAt", "folderId", "id", "name", "originalName", "path", "size", "storageName", "updatedAt", "userId", COALESCE("mimeType", 'application/octet-stream') FROM "files";
DROP TABLE "files";
ALTER TABLE "new_files" RENAME TO "files";
CREATE INDEX "files_userId_folderId_idx" ON "files"("userId", "folderId");
CREATE INDEX "files_userId_name_idx" ON "files"("userId", "name");
CREATE INDEX "files_type_idx" ON "files"("type");
CREATE INDEX "files_size_idx" ON "files"("size");
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "folders_userId_parentId_idx" ON "folders"("userId", "parentId");

-- CreateIndex
CREATE INDEX "folders_userId_path_idx" ON "folders"("userId", "path");

-- CreateIndex
CREATE INDEX "folders_name_idx" ON "folders"("name");

-- CreateIndex
CREATE INDEX "folders_createdAt_idx" ON "folders"("createdAt");

-- CreateIndex
CREATE INDEX "shares_token_idx" ON "shares"("token");

-- CreateIndex
CREATE INDEX "shares_fileId_idx" ON "shares"("fileId");

-- CreateIndex
CREATE INDEX "shares_userId_idx" ON "shares"("userId");

-- CreateIndex
CREATE INDEX "shares_expiresAt_idx" ON "shares"("expiresAt");

-- CreateIndex
CREATE INDEX "shares_isActive_idx" ON "shares"("isActive");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
