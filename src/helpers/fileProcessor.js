import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execSync } from "child_process";
import { showToast, Toast } from "@raycast/api";
import { Preferences } from "../api/preferences.js";

// Simple shell escape function (alternative to shell-escape package)
const shellEscape = (args) => {
  return args
    .map((arg) => {
      if (typeof arg !== "string") return arg;
      if (/^[\w\-./]+$/.test(arg)) return arg; // Safe characters, no escaping needed
      return `"${arg.replace(/"/g, '\\"')}"`; // Escape quotes and wrap in quotes
    })
    .join(" ");
};

// File processing backends
export const FileBackend = {
  SIMPLE: "simple",
  MARKITDOWN: "markitdown",
  DOCLING: "docling",
};

// Supported file extensions for each backend
const BACKEND_SUPPORT = {
  [FileBackend.SIMPLE]: [
    ".txt",
    ".md",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".java",
    ".cpp",
    ".c",
    ".html",
    ".css",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".sh",
    ".bat",
    ".sql",
  ],
  [FileBackend.MARKITDOWN]: [
    ".pdf",
    ".docx",
    ".pptx",
    ".xlsx",
    ".doc",
    ".ppt",
    ".xls",
    ".odt",
    ".odp",
    ".ods",
    ".rtf",
    ".epub",
    ".mobi",
  ],
  [FileBackend.DOCLING]: [".pdf", ".docx", ".pptx", ".xlsx", ".doc", ".ppt", ".xls", ".html", ".md", ".txt"],
};

// Get the appropriate backend for a file based on its extension
export const getBackendForFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  // Check user preference for backend
  const preferredBackend = Preferences["fileProcessingBackend"] || FileBackend.SIMPLE;

  if (BACKEND_SUPPORT[preferredBackend]?.includes(ext)) {
    return preferredBackend;
  }

  // Otherwise, find the first backend that supports the file
  for (const [backend, extensions] of Object.entries(BACKEND_SUPPORT)) {
    if (extensions.includes(ext)) {
      return backend;
    }
  }

  return preferredBackend;
};

// Simple text file reader
const processWithSimple = (filePath) => {
  try {
    let toast;
    showToast({
      style: Toast.Style.Animated,
      title: `Reading ${path.basename(filePath)}`,
      message: `Using Simple Reader...`,
    }).then((t) => {
      toast = t;
    });
    const content = fs.readFileSync(filePath, "utf8");
    if (toast) toast.hide();
    return {
      content,
      backend: FileBackend.SIMPLE,
      success: true,
    };
  } catch (error) {
    return {
      content: `[Error reading file: ${error.message}]`,
      backend: FileBackend.SIMPLE,
      success: false,
      error: error.message,
    };
  }
};

// Process file using markitdown
const processWithMarkitdown = (filePath) => {
  const fileName = path.basename(filePath);
  let toast;

  try {
    showToast({
      style: Toast.Style.Animated,
      title: `Processing ${fileName}`,
      message: `Using MarkItDown...`,
    }).then((t) => {
      toast = t;
    });

    // Use markitdown to convert to markdown
    const args = [filePath];
    const escapedArgs = shellEscape(args);
    const command = `markitdown ${escapedArgs}`;

    const result = execSync(command, {
      encoding: "utf8",
      timeout: 60000, // 60 second timeout
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin/:/usr/local/bin/` },
    });

    if (toast) toast.hide();

    return {
      content: result.trim(),
      backend: FileBackend.MARKITDOWN,
      success: true,
    };
  } catch (error) {
    if (toast) toast.hide();

    console.error(`Markitdown failed for ${filePath}:`, error.message);
    return {
      content: `[Error processing with markitdown: ${error.message}]`,
      backend: FileBackend.MARKITDOWN,
      success: false,
      error: error.message,
    };
  }
};

// Create a temporary folder for docling output
const createTempFolder = () => {
  const tempDir = path.join(os.tmpdir(), `docling-${crypto.randomBytes(6).toString("hex")}`);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return tempDir;
};

// Process file using docling
const processWithDocling = (filePath) => {
  const fileName = path.basename(filePath);
  let toast;
  let tempFolder = null;

  try {
    showToast({
      style: Toast.Style.Animated,
      title: `Processing ${fileName}`,
      message: `Using Docling...`,
    }).then((t) => {
      toast = t;
    });

    // Set up temp folder
    tempFolder = createTempFolder();

    const args = [
      filePath,
      "--to",
      "md",
      "--output",
      tempFolder,
      "--pdf-backend",
      "dlparse_v4",
      "--ocr-engine",
      "ocrmac",
      "--image-export-mode",
      "placeholder",
    ];

    const escapedArgs = shellEscape(args);
    const command = `docling ${escapedArgs}`;
    console.log(`Executing: ${command}`);

    execSync(command, {
      timeout: 120000, // 2 minute timeout
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin/:/usr/local/bin/` },
      stdio: "inherit",
    });

    // Find the output file
    const files = fs.readdirSync(tempFolder).filter((file) => fs.statSync(path.join(tempFolder, file)).isFile());

    // Look for .md file first
    let outputFile = files.find((file) => file.endsWith(".md"));

    if (!outputFile && files.length > 0) {
      // Use the largest file if no .md found
      outputFile = files.reduce((a, b) =>
        fs.statSync(path.join(tempFolder, a)).size > fs.statSync(path.join(tempFolder, b)).size ? a : b
      );
      console.log(`No .md file found, using largest file: ${outputFile}`);
    }

    if (!outputFile) {
      throw new Error("No output file found in temp folder");
    }

    // Read the converted content
    const outputPath = path.join(tempFolder, outputFile);
    const content = fs.readFileSync(outputPath, "utf8");

    // Clean up temp folder
    fs.rmSync(tempFolder, { recursive: true, force: true });

    if (toast) toast.hide();

    return {
      content: content.trim(),
      backend: FileBackend.DOCLING,
      success: true,
    };
  } catch (error) {
    if (toast) toast.hide();

    // Clean up temp folder on error
    if (tempFolder && fs.existsSync(tempFolder)) {
      try {
        fs.rmSync(tempFolder, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temp folder: ${cleanupError.message}`);
      }
    }

    console.error(`Docling failed for ${filePath}:`, error.message);
    return {
      content: `[Error processing with docling: ${error.message}]`,
      backend: FileBackend.DOCLING,
      success: false,
      error: error.message,
    };
  }
};

// Extract and format text content from a file
export const extractTextFromFile = (filePath) => {
  console.log(`Extracting text from file: ${filePath}`);
  try {
    // Get file mtime for caching
    const stats = fs.statSync(filePath);
    const mtime = stats.mtime.getTime();

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

${result.content}`;

    return {
      path: filePath,
      content: formattedContent,
      backend: result.backend,
      success: result.success,
      error: result.error,
      mtime: mtime,
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return {
      path: filePath,
      content: `---\nFile: ${filePath}\nBackend: error\nSuccess: false\nError: ${error.message}\n\n[Error processing file: ${error.message}]`,
      backend: "error",
      success: false,
      error: error.message,
      mtime: 0,
    };
  }
};

// Convert file paths to file objects with memoized content
export const processFiles = (files) => {
  if (!files || files.length === 0) return [];
  
  console.log(`Processing ${files.length} files:`, files.map(f => typeof f === 'string' ? f : f.path || 'unknown'));

  return files.map((file) => {
    // If it's a file path string, convert it to a file object
    if (typeof file === "string") {
      console.warn(`Processing raw file path: ${file}`);
      return extractTextFromFile(file);
    }

    // If already a file object, check if we need to refresh
    if (typeof file === "object" && file.path && file.content) {
      try {
        // Check if file has been modified since last processing
        const stats = fs.statSync(file.path);
        const currentMtime = stats.mtime.getTime();

        // If mtime has changed, reprocess the file
        if (file.mtime && currentMtime !== file.mtime) {
          console.log(`File ${file.path} has been modified, reprocessing...`);
          return extractTextFromFile(file.path);
        }

        // File hasn't changed, return cached version
        console.log(`Using cached file ${file.path}`);
        return file;
      } catch (error) {
        // File might not exist anymore, mark as error
        console.warn(`Error checking file ${file.path}:`, error.message);
        return {
          ...file,
          content: `---\nFile: ${file.path}\nError: File no longer accessible (${error.message})`,
          success: false,
          error: error.message,
        };
      }
    }

    // Handle unknown file format - log warning and return as-is
    console.warn(`Unknown file format:`, typeof file, file);
    return file; // fallback for unknown format
  });
};

// Check if any files in the array need processing (are still raw paths or have been modified)
export const needsProcessing = (files) => {
  if (!files || files.length === 0) return false;

  return files.some((file) => {
    // If it's a string path, it needs processing
    if (typeof file === "string") return true;

    // If it's an object, check if file has been modified
    if (typeof file === "object" && file.path && file.content && file.mtime) {
      try {
        const stats = fs.statSync(file.path);
        return stats.mtime.getTime() !== file.mtime;
      } catch {
        return false; // If file doesn't exist, consider it processed (will show error)
      }
    }

    return false;
  });
};

// Get file processing statistics
export const getProcessingStats = (files) => {
  if (!Array.isArray(files)) return null;

  const stats = {
    total: files.length,
    successful: 0,
    failed: 0,
    backends: {},
    cached: 0,
    needsProcessing: needsProcessing(files),
  };

  files.forEach((file) => {
    if (typeof file === "string") {
      // Raw path, not yet processed
      return;
    }

    if (file.success) {
      stats.successful++;
    } else {
      stats.failed++;
    }

    const backend = file.backend || "unknown";
    stats.backends[backend] = (stats.backends[backend] || 0) + 1;

    // Count cached files (those with mtime)
    if (file.mtime) {
      stats.cached++;
    }
  });

  return stats;
};
