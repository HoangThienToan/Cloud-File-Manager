import React, { useState } from 'react';
import Header from './Header';
import QuickActionsPanel from './QuickActionsPanel';
import StatusBar from './StatusBar';
import LanguageSwitcher from './LanguageSwitcher';
import { NotificationContainer } from './NotificationSystem';
import { useLanguage } from '../contexts/LanguageContext';
// import BucketCreateModal from './BucketCreateModal';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  showSidebar?: boolean;
  onUpload?: () => void;
  onCreateFolder?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  currentPath = '',
  showSidebar = true,
  onUpload,
  onCreateFolder
}) => {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(showSidebar);
  const [showBucketCreateModal, setShowBucketCreateModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [storageUsed, setStorageUsed] = useState(1.2);
  const storageTotal = 5.0;

  // Global method to show bucket create modal
  React.useEffect(() => {
    (window as any).showBucketCreateModal = () => {
      setShowBucketCreateModal(true);
    };
    
    return () => {
      (window as any).showBucketCreateModal = undefined;
    };
  }, []);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col transition-colors duration-200`}>
      {/* Header */}
      <Header 
        title="Cloud File Manager"
        actions={
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden sm:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm tệp..."
                  className={`w-64 pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
                <svg
                  className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Notifications */}
            <button 
              className={`relative p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title="Thông báo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                3
              </span>
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-yellow-400 hover:bg-gray-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={isDarkMode ? t('common.lightMode') || 'Chế độ sáng' : t('common.darkMode') || 'Chế độ tối'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Storage usage */}
            <div className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-gray-300' 
                : 'bg-white border-gray-300 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${storageUsed / storageTotal > 0.8 ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm">{storageUsed}GB / {storageTotal}GB</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if ((window as any).showBucketCreateModal) {
                    (window as any).showBucketCreateModal();
                  }
                }}
                className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                title="Tạo bucket để chia sẻ file công khai"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Tạo Bucket
              </button>
            
              <button 
                onClick={onCreateFolder}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tạo thư mục
              </button>
              
              <button 
                onClick={onUpload}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Tải lên
              </button>
            </div>
          </div>
        }
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className={`w-64 border-r flex flex-col overflow-y-auto transition-colors ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              <div className="mb-6">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Điều hướng
                </h3>
                <div className="space-y-1">
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    Tất cả tệp
                  </button>
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Đã chia sẻ
                    <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                      isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'
                    }`}>
                      5
                    </span>
                  </button>
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Yêu thích
                    <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                      isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'
                    }`}>
                      2
                    </span>
                  </button>
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Thùng rác
                  </button>
                </div>
              </div>

              {/* Quick access */}
              <div className="mb-6">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Truy cập nhanh
                </h3>
                <div className="space-y-1">
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <span className="text-lg">📁</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Documents</div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>42 tệp</div>
                    </div>
                  </button>
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <span className="text-lg">🖼️</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Images</div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>128 tệp</div>
                    </div>
                  </button>
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <span className="text-lg">🎵</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Music</div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>67 tệp</div>
                    </div>
                  </button>
                  <button className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <span className="text-lg">�</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Videos</div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>23 tệp</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent files */}
              <div className="mb-6">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Gần đây
                </h3>
                <div className="space-y-2">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📄</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Report_2025.pdf
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          2 giờ trước
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🖼️</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          screenshot.png
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          1 ngày trước
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            {/* Storage meter */}
            <div className={`p-4 border-t transition-colors ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`rounded-lg p-3 transition-colors ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Dung lượng
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {storageUsed}GB / {storageTotal}GB
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 mb-2 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      storageUsed / storageTotal > 0.8 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : storageUsed / storageTotal > 0.6
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${(storageUsed / storageTotal) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    {Math.round((storageUsed / storageTotal) * 100)}% đã sử dụng
                  </span>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    {(storageTotal - storageUsed).toFixed(1)}GB còn lại
                  </span>
                </div>
                <button className={`w-full text-xs font-medium py-2 px-3 rounded-md transition-colors ${
                  isDarkMode 
                    ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-600' 
                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                }`}>
                  <div className="flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
                    </svg>
                    Nâng cấp dung lượng
                  </div>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Breadcrumb */}
          {currentPath && (
            <div className={`border-b px-6 py-3 transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <nav className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <button className={`transition-colors flex items-center gap-1 ${
                  isDarkMode ? 'hover:text-blue-400' : 'hover:text-blue-600'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Trang chủ
                </button>
                <span className={`mx-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>/</span>
                <span className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>{currentPath}</span>
              </nav>
            </div>
          )}

          {/* Page content */}
          <div className="p-6 pb-16">
            {children}
          </div>

          {/* Status Bar */}
          <StatusBar
            isDarkMode={isDarkMode}
            filesCount={42}
            foldersCount={8}
            selectedCount={0}
            currentPath={currentPath}
            syncStatus="synced"
          />
        </main>
      </div>

      {/* Quick Actions Panel */}
      <QuickActionsPanel
        isDarkMode={isDarkMode}
        onUpload={onUpload}
        onCreateFolder={onCreateFolder}
        onCreateBucket={() => {
          if ((window as any).showBucketCreateModal) {
            (window as any).showBucketCreateModal();
          }
        }}
      />

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-200 hover:scale-110 ${
          isDarkMode 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        title={sidebarOpen ? 'Ẩn menu' : 'Hiện menu'}
      >
        <svg 
          className={`w-6 h-6 transition-transform duration-200 ${sidebarOpen ? 'rotate-90' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Quick Actions Panel */}
      <QuickActionsPanel
        isDarkMode={isDarkMode}
        onUpload={onUpload}
        onCreateFolder={onCreateFolder}
        onCreateBucket={() => {
          if ((window as any).showBucketCreateModal) {
            (window as any).showBucketCreateModal();
          }
        }}
      />

      {/* Notification Container */}
      <NotificationContainer isDarkMode={isDarkMode} />

      {/* Bucket Create Modal */}
      {/*showBucketCreateModal && (
        <BucketCreateModal
          isOpen={showBucketCreateModal}
          onClose={() => setShowBucketCreateModal(false)}
          onBucketCreated={() => {
            setShowBucketCreateModal(false);
            // Optionally refresh data or show success message
            window.location.reload();
          }}
        />
      )*/}
    </div>
  );
};

export default AppLayout;
