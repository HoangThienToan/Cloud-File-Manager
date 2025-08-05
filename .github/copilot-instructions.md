# Cloud File Manager - GitHub Copilot Instructions

<!-- Custom instructions for GitHub Copilot to understand this project better -->

## Ngôn Ngữ Giao Tiếp
- **QUAN TRỌNG**: Luôn trò chuyện và trả lời bằng tiếng Việt
- Sử dụng thuật ngữ kỹ thuật phù hợp nhưng giải thích rõ ràng
- Cung cấp thông tin chi tiết và dễ hiểu

## Quy Trình Phát Triển An Toàn
- **BẮTT BUỘC**: Trước khi thực hiện bất kỳ thay đổi nào có khả năng gây lỗi, PHẢI commit và push code hiện tại lên GitHub
- Luôn kiểm tra trạng thái git trước khi bắt đầu thay đổi lớn
- Tạo commit có ý nghĩa với message rõ ràng bằng tiếng Việt
- Thực hiện thay đổi từng bước nhỏ, test sau mỗi bước

## Tổng Quan Dự Án
## Tổng Quan Dự Án
Đây là một ứng dụng quản lý file đám mây hiện đại được xây dựng với Next.js 15, React 18, và TypeScript. Hệ thống cung cấp trải nghiệm quản lý file giống như máy tính để bàn với các tính năng nâng cao.

### Các Tính Năng Cốt Lõi
- **Quản Lý File Nâng Cao**: Tải lên, tải xuống, sao chép, cắt, dán, đổi tên, xóa file và thư mục
- **Thao Tác Thư Mục**: Tạo, điều hướng và sắp xếp cấu trúc thư mục với các thao tác đệ quy
- **Chọn Nhiều Mục**: Chọn nâng cao với Ctrl+click, kéo để chọn, và phím tắt
- **Tìm Kiếm & Lọc**: Tìm kiếm thời gian thực với nhiều tùy chọn sắp xếp (tên, kích thước, ngày)
- **Chế Độ Xem**: Chế độ danh sách và lưới với thiết kế responsive
- **Kéo & Thả**: Tải file lên bằng cách kéo thả với phản hồi trực quan
- **Menu Ngữ Cảnh**: Menu chuột phải với các hành động có mã màu và phím tắt
- **Thao Tác Clipboard**: Sao chép/cắt/dán với chỉ báo trực quan và đặt tên duy nhất
- **Xác Thực Người Dùng**: Xác thực dựa trên JWT với kiểm soát truy cập file an toàn
- **Đa Ngôn Ngữ**: Hỗ trợ chuyển đổi giữa tiếng Việt và tiếng Anh với localStorage persistence

## Công Nghệ Sử Dụng
- **Frontend**: Next.js 15.4.5, React 18, TypeScript, Tailwind CSS
- **Backend**: API routes của Next.js với middleware
- **Cơ Sở Dữ Liệu**: SQLite với Prisma ORM (sẵn sàng cho PostgreSQL trong production)
- **Lưu Trữ File**: Hệ thống file cục bộ với tổ chức dựa trên UUID
- **Xác Thực**: JWT token với cookie HTTP-only an toàn
- **Thành Phần UI**: Các component tùy chỉnh với hệ thống thiết kế hiện đại
- **Đa Ngôn Ngữ**: React Context API với localStorage cho persistence

## Hệ Thống Đa Ngôn Ngữ
### Cấu Trúc
- **LanguageContext**: React Context để quản lý ngôn ngữ hiện tại
- **LanguageProvider**: Provider component wrap toàn bộ ứng dụng
- **Translation files**: JSON files chứa văn bản cho từng ngôn ngữ
- **useLanguage hook**: Custom hook để sử dụng translation trong components

### Ngôn Ngữ Hỗ Trợ
- **Tiếng Việt (vi)**: Ngôn ngữ mặc định
- **Tiếng Anh (en)**: Ngôn ngữ phụ

### Cách Triển Khai
```typescript
// LanguageContext structure
interface LanguageContextType {
  language: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
  t: (key: string) => string; // Translation function
}

// Usage in components
const { t, language, setLanguage } = useLanguage();
return <button>{t('upload')}</button>;
```

## Architecture Patterns

### Component Structure
```
src/
├── app/                    # Next.js App Router pages and API routes
├── components/             # Reusable UI components
│   ├── AppLayout.tsx      # Main application layout
│   ├── FileManagerLayout.tsx  # Core file manager component
│   ├── ContextMenu.tsx    # Right-click context menu
│   └── types.ts           # TypeScript type definitions
├── lib/                   # Utility functions and services
│   ├── auth.ts           # Authentication utilities
│   ├── fileService.ts    # File operation services
│   ├── nameUtils.ts      # Unique naming utilities
│   └── prisma.ts         # Database client
```

### Key Components
- **FileManagerLayout**: Main file manager with all advanced features
- **AppLayout**: Application shell with navigation and user management
- **ContextMenu**: Advanced right-click menu with color-coded actions
- **FolderTreeNode**: Recursive folder tree navigation

## Development Guidelines

### Code Style
- Use TypeScript for all files (strict mode)
- Prefer functional components with React hooks
- Use Tailwind CSS for styling with consistent design tokens
- Implement proper error boundaries and loading states
- Follow Next.js 15 App Router conventions

### File Naming
- Components: PascalCase (e.g., `FileManagerLayout.tsx`)
- API routes: lowercase with hyphens (e.g., `files/copy/route.ts`)
- Utilities: camelCase (e.g., `nameUtils.ts`)
- Types: PascalCase interfaces (e.g., `Item`, `FileManagerProps`)

### API Design
- RESTful endpoints under `/api/`
- Consistent error handling with HTTP status codes
- Input validation using Zod schemas
- Proper authentication middleware
- Rate limiting for security

### State Management
- Local component state với useState/useReducer
- Context cho global state (theme, notifications, language)
- Server state qua API calls với proper error handling
- Không sử dụng external state management library (giữ đơn giản)

### Internationalization (i18n)
- Sử dụng React Context để quản lý ngôn ngữ
- Translation keys có cấu trúc rõ ràng và dễ maintain
- Hỗ trợ dynamic language switching không cần reload page
- Persist language preference trong localStorage
- Fallback về tiếng Việt nếu translation không tồn tại

## Hướng Dẫn Triển Khai Tính Năng

### Hệ Thống Đa Ngôn Ngữ
```typescript
// 1. Tạo LanguageContext
interface LanguageContextType {
  language: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
  t: (key: string, params?: Record<string, string>) => string;
}

// 2. Translation files structure
// src/translations/vi.json
{
  "upload": "Tải lên",
  "download": "Tải xuống", 
  "delete": "Xóa",
  "rename": "Đổi tên",
  "copy": "Sao chép",
  "cut": "Cắt",
  "paste": "Dán",
  "search": "Tìm kiếm",
  "createFolder": "Tạo thư mục",
  "selectAll": "Chọn tất cả",
  "fileManager": "Trình quản lý tệp tin",
  "welcomeMessage": "Chào mừng bạn đến với {{appName}}"
}

// 3. Usage trong components
const { t, language, setLanguage } = useLanguage();
return (
  <div>
    <button>{t('upload')}</button>
    <p>{t('welcomeMessage', { appName: 'Cloud Manager' })}</p>
  </div>
);
```

## Feature Implementation Guidelines

### File Operations
- Always validate file types and sizes
- Use UUID-based storage names to prevent conflicts
- Implement atomic operations for data consistency
- Provide visual feedback for all operations
- Handle edge cases (network errors, file conflicts)

### Copy/Cut/Paste Operations
- Use unique naming algorithm for conflicts (nameUtils.ts)
- Support recursive folder copying with all contents
- Visual clipboard indicators for user feedback
- Keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V)

### Multi-Select Features
- Support Ctrl+click for individual selection
- Drag selection with visual rectangle
- Select all with Ctrl+A
- Bulk operations on selected items
- Clear visual indicators for selected state

### Keyboard Shortcuts
- F1: Show help modal
- F2: Rename selected item
- Delete: Delete selected items
- Ctrl+A: Select all
- Ctrl+C/X/V: Copy/cut/paste
- Escape: Clear selection/close modals
- V: Toggle view mode
- M: Toggle multi-select

### UI/UX Principles
- Desktop-like experience with familiar interactions
- Consistent visual hierarchy and spacing
- Loading states and error feedback
- Responsive design for all screen sizes
- Accessibility considerations (ARIA labels, keyboard navigation)

## Security Best Practices
- JWT token validation on all protected routes
- File access control by user ownership
- Path sanitization to prevent directory traversal
- File type validation and size limits
- Rate limiting on authentication endpoints
- Audit logging for security events

## Database Schema
```prisma
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  password String   # bcrypt hashed
  files    File[]
  folders  Folder[]
  createdAt DateTime @default(now())
}

model File {
  id           String  @id @default(cuid())
  name         String  # Display name
  originalName String  # Original upload name
  storageName  String? # UUID-based storage filename
  size         Int?
  mimeType     String?
  path         String  # Virtual path
  userId       String
  folderId     String?
  user         User    @relation(fields: [userId], references: [id])
  folder       Folder? @relation(fields: [folderId], references: [id])
}

model Folder {
  id       String   @id @default(cuid())
  name     String
  path     String   # Virtual path (e.g., "/Documents/Photos")
  parentId String?
  userId   String
  files    File[]
  parent   Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children Folder[] @relation("FolderHierarchy")
  user     User     @relation(fields: [userId], references: [id])
}
```

## Common Patterns

### Error Handling
```typescript
try {
  const result = await operation();
  return NextResponse.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { error: 'Operation failed' },
    { status: 500 }
  );
}
```

### File Operations
```typescript
// Always check user ownership
const file = await prisma.file.findFirst({
  where: { id: fileId, userId: user.id }
});

if (!file) {
  return NextResponse.json({ error: 'File not found' }, { status: 404 });
}
```

### Component Props
```typescript
interface ComponentProps {
  // Always include proper TypeScript types
  items: Item[];
  onAction: (id: string) => void;
  loading?: boolean;
  error?: string;
}
```

## Testing Strategy
- Focus on core file operations (upload, download, copy, move)
- Test authentication and authorization flows
- Validate unique naming algorithm
- Test recursive folder operations
- Edge case handling (large files, deep folder structures)

## Performance Considerations
- Lazy loading for large file lists
- Efficient database queries with proper indexing
- Image optimization for file previews
- Debounced search input
- Virtual scrolling for large datasets

## Deployment Notes
- Environment variables for database and JWT secrets
- File upload size limits configuration
- CORS configuration for API access
- Static file serving optimization
- Database migration strategy
