import { prisma } from './prisma';

export const generateUniqueName = async (
  baseName: string,
  userId: string,
  parentId: string | null,
  type: 'file' | 'folder'
): Promise<string> => {
  let counter = 1;
  let newName = `${baseName} - Copy`;
  
  while (true) {
    // Check if name exists
    const existing = await checkNameExists(newName, userId, parentId, type);
    
    if (!existing) {
      return newName;
    }
    
    counter++;
    newName = `${baseName} - Copy (${counter})`;
  }
};

const checkNameExists = async (
  name: string,
  userId: string,
  parentId: string | null,
  type: 'file' | 'folder'
): Promise<boolean> => {
  if (type === 'folder') {
    const existing = await prisma.folder.findFirst({
      where: {
        name,
        userId,
        parentId
      }
    });
    return !!existing;
  } else {
    const existing = await prisma.file.findFirst({
      where: {
        name,
        userId,
        folderId: parentId
      }
    });
    return !!existing;
  }
};
