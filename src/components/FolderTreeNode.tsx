import React from "react";

interface FolderTreeNodeProps {
  node: any;
  currentFolder: string | null;
  setCurrentFolder: (id: string | null) => void;
  level?: number;
  onTripleClick?: () => void; // Optional callback for triple click
  getFolderIcon?: (folderName: string) => string;
}

function FolderVerticalLine({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <span
      className="absolute left-0 top-0 h-full border-l border-gray-300"
      style={{ left: (level - 1) * 16 + 7, width: 0 }}
    />
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#fbbf24" />
      <path d="M4 8a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.41.59l1.83 1.83A2 2 0 0 0 13.83 9H18a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" fill="#fde68a" />
    </svg>
  );
}

const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({ 
  node, 
  currentFolder, 
  setCurrentFolder, 
  level = 0, 
  onTripleClick,
  getFolderIcon = (name) => '📁'
}) => {
  const hasChildren = node.children && node.children.length > 0;
  // Only single click to enter folder, no waiting
  const handleClick = () => {
    setCurrentFolder(node.id);
  };
  return (
    <div className="relative">
      <div
        style={{ marginLeft: level * 16 }}
        className={`flex items-center gap-1 py-0.5 cursor-pointer rounded px-1 ${currentFolder === node.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}
        onClick={handleClick}
      >
        <FolderVerticalLine level={level} />
        <span className="text-lg">{getFolderIcon(node.name)}</span>
        <span className="truncate max-w-[120px]" title={node.name}>{node.name}</span>
      </div>
      {hasChildren && node.children.map((child: any) => (
        <FolderTreeNode
          key={child.id}
          node={child}
          currentFolder={currentFolder}
          setCurrentFolder={setCurrentFolder}
          level={level + 1}
          onTripleClick={onTripleClick}
          getFolderIcon={getFolderIcon}
        />
      ))}
    </div>
  );
};

export default FolderTreeNode;
