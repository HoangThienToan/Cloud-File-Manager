# Cloud File Storage System - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a cloud file storage system built with Next.js and TypeScript. The system provides:

- File upload/download functionality
- User authentication and authorization
- File sharing capabilities
- RESTful API endpoints for remote access
- Database integration for metadata storage
- Web interface for file management

## Architecture
- **Frontend**: Next.js with React, TypeScript, and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with Prisma ORM (can be upgraded to PostgreSQL)
- **File Storage**: Local file system with organized directory structure
- **Authentication**: JWT-based authentication

## Key Features
1. **User Management**: Registration, login, profile management
2. **File Operations**: Upload, download, delete, rename files
3. **Folder Management**: Create, organize, and navigate folders
4. **File Sharing**: Generate shareable links for files
5. **API Access**: RESTful endpoints for programmatic access
6. **Security**: File access control and user isolation

## Development Guidelines
- Use TypeScript for all components and API routes
- Implement proper error handling and validation
- Follow REST API conventions
- Ensure secure file access patterns
- Use Prisma for database operations
- Implement proper file upload size limits
- Add comprehensive logging for debugging

## Security Considerations
- Validate all file uploads
- Implement proper authentication checks
- Sanitize file names and paths
- Prevent directory traversal attacks
- Limit file sizes and types
- Secure API endpoints
