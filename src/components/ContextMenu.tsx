import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: Array<{
    label: string;
    icon?: string;
    onClick?: () => void;
    disabled?: boolean;
    separator?: boolean;
    danger?: boolean;
    color?: 'default' | 'blue' | 'green' | 'red' | 'orange' | 'purple';
  }>;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items }) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 250);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 45));

  const getItemColors = (item: any) => {
    if (item.disabled) {
      return 'text-gray-400 cursor-not-allowed bg-gray-50';
    }
    
    if (item.danger) {
      return 'text-red-600 hover:bg-red-50 hover:text-red-700';
    }
    
    const colorMap = {
      blue: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
      green: 'text-green-600 hover:bg-green-50 hover:text-green-700',
      red: 'text-red-600 hover:bg-red-50 hover:text-red-700',
      orange: 'text-orange-600 hover:bg-orange-50 hover:text-orange-700',
      purple: 'text-purple-600 hover:bg-purple-50 hover:text-purple-700',
      default: 'text-gray-700 hover:bg-gray-50'
    };
    
    return colorMap[item.color as keyof typeof colorMap || 'default'];
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <hr key={index} className="my-1 border-gray-200" />;
        }
        
        return (
          <button
            key={index}
            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${getItemColors(item)}`}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="text-base">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;
