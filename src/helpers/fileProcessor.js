import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { Preferences } from "../api/preferences.js";

// File processing backends
export const FileBackend = {
  SIMPLE: "simple",
  MARKITDOWN: "markitdown",
  DOCLING: "docling"
};

// Supported file extensions for each backend
const BACKEND_SUPPORT = {
  [FileBackend.SIMPLE]: ['.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.html', '.css', '.json', '.xml', '.yaml', '.yml', '.sh', '.bat', '.sql'],
  [FileBackend.MARKITDOWN]: ['.pdf', '.docx', '.pptx', '.xlsx', '.doc', '.ppt', '.xls', '.odt', '.odp', '.ods', '.rtf', '.epub', '.mobi'],
  [FileBackend.DOCLING]: ['.pdf', '.docx', '.pptx', '.xlsx', '.doc', '.ppt', '.xls', '.html', '.md', '.txt']
};

// Get the appropriate backend for a file based on its extension
export const getBackendForFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  // Check user preference for backend
  const preferredBackend = Preferences["fileProcessingBackend"] || FileBackend.SIMPLE;
  
  // If preferred backend supports the file, use it
  if (BACKEND_SUPPORT[preferredBackend]?.includes(ext)) {
    return preferredBackend;
  }
  
  // Otherwise, find the first backend that supports the file
  for (const [backend, extensions] of Object.entries(BACKEND_SUPPORT)) {
    if (extensions.includes(ext)) {
      return backend;
    }
  }
  
  // Fallback to simple backend for unknown extensions
  return FileBackend.SIMPLE;
};

// Check if a tool is available in PATH
const isToolAvailable = (tool) => {
  try {
    execSync(`which ${tool}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// Simple text file reader
const processWithSimple = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return {
      content,
      backend: FileBackend.SIMPLE,
      success: true
    };
  } catch (error) {
    return {
      content: `[Error reading file: ${error.message}]`,
      backend: FileBackend.SIMPLE,
      success: false,
      error: error.message
    };
  }
};

// Process file using markitdown
const processWithMarkitdown = (filePath) => {
  try {
    if (!isToolAvailable('markitdown')) {
      throw new Error('markitdown is not installed. Install it with: pip install markitdown');
    }
    
    // Use markitdown to convert to markdown
    const result = execSync(`markitdown "${filePath}"`, {
      encoding: 'utf8',
      timeout: 60000, // 60 second timeout
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin/:/usr/local/bin/` }
    });
    
    return {
      content: result.trim(),
      backend: FileBackend.MARKITDOWN,
      success: true
    };
  } catch (error) {
    console.error(`Markitdown failed for ${filePath}:`, error.message);
    // Fallback to simple processing for text-like files
    const ext = path.extname(filePath).toLowerCase();
    if (BACKEND_SUPPORT[FileBackend.SIMPLE].includes(ext)) {
      return processWithSimple(filePath);
    }
    return {
      content: `[Error processing with markitdown: ${error.message}]`,
      backend: FileBackend.MARKITDOWN,
      success: false,
      error: error.message
    };
  }
};

// Process file using docling
const processWithDocling = (filePath) => {
  try {
    if (!isToolAvailable('docling')) {
      throw new Error('docling is not installed. Install it with: pip install docling');
    }
    
    // Use docling to convert to markdown
    const result = execSync(`docling "${filePath}" --to md --output /dev/stdout`, {
      encoding: 'utf8',
      timeout: 120000, // 2 minute timeout
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin/:/usr/local/bin/` }
    });
    
    return {
      content: result.trim(),
      backend: FileBackend.DOCLING,
      success: true
    };
  } catch (error) {
    console.error(`Docling failed for ${filePath}:`, error.message);
    // Try markitdown as fallback
    if (BACKEND_SUPPORT[FileBackend.MARKITDOWN].includes(path.extname(filePath).toLowerCase())) {
      return processWithMarkitdown(filePath);
    }
    // Then try simple as final fallback
    const ext = path.extname(filePath).toLowerCase();
    if (BACKEND_SUPPORT[FileBackend.SIMPLE].includes(ext)) {
      return processWithSimple(filePath);
    }
    return {
      content: `[Error processing with docling: ${error.message}]`,
      backend: FileBackend.DOCLING,
      success: false,
      error: error.message
    };
  }
};

// Extract and format text content from a file
export const extractTextFromFile = (filePath) => {
  try {
    const backend = getBackendForFile(filePath);
    let result;
    
    switch (backend) {
      case FileBackend.MARKITDOWN:
        result = processWithMarkitdown(filePath);
        break;
      case FileBackend.DOCLING:
        result = processWithDocling(filePath);
        break;
      case FileBackend.SIMPLE:
      default:
        result = processWithSimple(filePath);
        break;
    }
    
    // Format the content with file metadata
    const formattedContent = `---
File: ${filePath}
Backend: ${result.backend}
Success: ${result.success}${result.error ? `\nError: ${result.error}` : ''}

${result.content}`;
    
    return {
      path: filePath,
      content: formattedContent,
      backend: result.backend,
      success: result.success,
      error: result.error
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return {
      path: filePath,
      content: `---\nFile: ${filePath}\nBackend: error\nSuccess: false\nError: ${error.message}\n\n[Error processing file: ${error.message}]`,
      backend: 'error',
      success: false,
      error: error.message
    };
  }
};

// Convert file paths to file objects with memoized content
export const processFiles = (files) => {
  if (!files || files.length === 0) return [];
  
  return files.map(file => {
    // If already a file object, return as-is
    if (typeof file === 'object' && file.path && file.content) {
      return file;
    }
    // If it's a file path, convert it to a file object
    if (typeof file === 'string') {
      return extractTextFromFile(file);
    }
    return file; // fallback
  });
};

// Get file processing statistics
export const getProcessingStats = (files) => {
  if (!Array.isArray(files)) return null;
  
  const stats = {
    total: files.length,
    successful: 0,
    failed: 0,
    backends: {}
  };
  
  files.forEach(file => {
    if (file.success) {
      stats.successful++;
    } else {
      stats.failed++;
    }
    
    const backend = file.backend || 'unknown';
    stats.backends[backend] = (stats.backends[backend] || 0) + 1;
  });
  
  return stats;
};