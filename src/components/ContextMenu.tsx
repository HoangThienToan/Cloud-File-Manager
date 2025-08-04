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
    danger?: boolean; // New prop for dangerous actions
    color?: 'default' | 'blue' | 'green' | 'red' | 'orange' | 'purple'; // New prop for colors
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

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 250);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 45));

  const getItemColors = (item: any) => {
    if (item.disabled) {
      return 'text-gray-400 cursor-not-allowed bg-gray-50';
    }
    
    if (item.danger) {
      return 'text-red-600 hover:text-red-700 hover:bg-red-50';
    }

    switch (item.color) {
      case 'blue':
        return 'text-blue-600 hover:text-blue-700 hover:bg-blue-50';
      case 'green':
        return 'text-green-600 hover:text-green-700 hover:bg-green-50';
      case 'orange':
        return 'text-orange-600 hover:text-orange-700 hover:bg-orange-50';
      case 'purple':
        return 'text-purple-600 hover:text-purple-700 hover:bg-purple-50';
      default:
        return 'text-gray-700 hover:text-gray-900 hover:bg-gray-100';
    }
  };
    
    if (item.danger || item.color === 'red') {
      return 'text-red-600 hover:bg-red-50 hover:text-red-700';
    }
    
    switch (item.color) {
      case 'blue':
        return 'text-blue-600 hover:bg-blue-50 hover:text-blue-700';
      case 'green':
        return 'text-green-600 hover:bg-green-50 hover:text-green-700';
      case 'orange':
        return 'text-orange-600 hover:bg-orange-50 hover:text-orange-700';
      case 'purple':
        return 'text-purple-600 hover:bg-purple-50 hover:text-purple-700';
      default:
        return 'text-gray-700 hover:bg-gray-50';
    }
  };

  return (
    <div
      ref={menuRef}
      className="context-menu fixed bg-white border border-gray-200 rounded-xl shadow-2xl py-2 min-w-[220px] z-50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: adjustedX,
        top: adjustedY,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.separator && (
            <div className="my-2 px-3">
              <hr className="border-gray-200" />
            </div>
          )}
          <button
            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150 font-medium text-sm rounded-lg mx-2 my-1 ${getItemColors(item)} ${
              !item.disabled ? 'active:scale-[0.98] transform' : ''
            }`}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            style={{
              width: 'calc(100% - 16px)',
            }}
          >
            {item.icon && (
              <div className="flex items-center justify-center w-5 h-5">
                <span className="text-base leading-none">{item.icon}</span>
              </div>
            )}
            <span className="flex-1 leading-none">{item.label}</span>
            {(item.danger || item.color === 'red') && !item.disabled && (
              <div className="w-2 h-2 bg-red-400 rounded-full opacity-60"></div>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;
