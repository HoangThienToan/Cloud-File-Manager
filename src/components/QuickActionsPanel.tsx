import React, { useState } from 'react';

interface QuickActionsPanelProps {
  isDarkMode: boolean;
  onUpload?: () => void;
  onCreateFolder?: () => void;
  onCreateBucket?: () => void;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  isDarkMode,
  onUpload,
  onCreateFolder,
  onCreateBucket
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      id: 'upload',
      label: 'Tải lên tệp',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      onClick: onUpload,
      color: 'blue'
    },
    {
      id: 'folder',
      label: 'Tạo thư mục',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      onClick: onCreateFolder,
      color: 'green'
    },
    {
      id: 'bucket',
      label: 'Tạo bucket',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: onCreateBucket,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string, isHover: boolean = false) => {
    const colors = {
      blue: isHover 
        ? 'bg-blue-600 text-white' 
        : isDarkMode 
          ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800' 
          : 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      green: isHover 
        ? 'bg-green-600 text-white' 
        : isDarkMode 
          ? 'bg-green-900/50 text-green-300 hover:bg-green-800' 
          : 'bg-green-100 text-green-600 hover:bg-green-200',
      purple: isHover 
        ? 'bg-purple-600 text-white' 
        : isDarkMode 
          ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800' 
          : 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Main toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
          isDarkMode 
            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
        } ${isExpanded ? 'rotate-45' : ''}`}
        title="Thao tác nhanh"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Action buttons */}
      <div className={`absolute bottom-16 left-0 space-y-3 transition-all duration-300 ${
        isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, index) => (
          <div
            key={action.id}
            className="flex items-center gap-3"
            style={{
              transitionDelay: `${index * 50}ms`
            }}
          >
            {/* Label */}
            <div className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 text-gray-200 border border-gray-700' 
                : 'bg-white text-gray-700 border border-gray-200 shadow-sm'
            }`}>
              {action.label}
            </div>
            
            {/* Action button */}
            <button
              onClick={action.onClick}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 ${
                getColorClasses(action.color)
              }`}
              title={action.label}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default QuickActionsPanel;
