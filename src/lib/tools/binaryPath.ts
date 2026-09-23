import path from 'path';
import fs from 'fs';

/**
 * Dynamically resolves binary paths across Windows, Linux, and containerized cloud environments.
 * 1. Checks local `bin/<name>.exe` (Windows local development).
 * 2. Checks local `bin/<name>` (Linux/macOS local development).
 * 3. Falls back to system PATH (Docker, Linux VPS, Railway, Render, etc.).
 */
export function getBinaryPath(name: string): string {
  // Check Windows local binary
  const winPath = path.resolve(process.cwd(), 'bin', `${name}.exe`);
  if (fs.existsSync(winPath)) {
    return winPath;
  }

  // Check Unix local binary
  const unixPath = path.resolve(process.cwd(), 'bin', name);
  if (fs.existsSync(unixPath)) {
    return unixPath;
  }

  // Fallback to globally installed binary in PATH
  return name;
}
