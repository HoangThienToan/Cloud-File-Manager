import React, { useState } from 'react';
import Header from './Header';
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
  const [sidebarOpen, setSidebarOpen] = useState(showSidebar);
  const [showBucketCreateModal, setShowBucketCreateModal] = useState(false);

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Storage usage */}
            <div className="hidden lg:flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">1.2GB / 5GB</span>
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
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Điều hướng
                </h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    Tất cả tệp
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Đã chia sẻ
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Yêu thích
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Thùng rác
                  </button>
                </div>
              </div>

              {/* Quick access */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Truy cập nhanh
                </h3>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="text-lg">📁</span>
                    Documents
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="text-lg">🖼️</span>
                    Images
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="text-lg">🎵</span>
                    Music
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="text-lg">🎬</span>
                    Videos
                  </button>
                </div>
              </div>
            </nav>

            {/* Storage meter */}
            <div className="p-4 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Dung lượng</span>
                  <span className="text-xs text-gray-500">1.2GB / 5GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                </div>
                <button className="w-full mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Nâng cấp dung lượng
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Breadcrumb */}
          {currentPath && (
            <div className="bg-white border-b border-gray-200 px-6 py-3">
              <nav className="flex items-center text-sm text-gray-600">
                <button className="hover:text-blue-600 transition-colors flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Trang chủ
                </button>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-800">{currentPath}</span>
              </nav>
            </div>
          )}

          {/* Page content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

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
