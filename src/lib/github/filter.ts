const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "vendor",
  "__pycache__",
  ".venv",
  "coverage",
  ".turbo",
  ".cache",
  ".output",
  "out",
  ".nuxt",
  ".svelte-kit",
  "target",
  "bin",
  "obj",
]);

const IGNORED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Gemfile.lock",
  "poetry.lock",
  "composer.lock",
  "Cargo.lock",
  "go.sum",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  ".yaml",
  ".yml",
  ".toml",
  ".json",
  ".md",
  ".mdx",
  ".txt",
  ".sh",
  ".bash",
  ".zsh",
  ".dockerfile",
  ".xml",
  ".svg",
  ".env.example",
  ".gitignore",
  ".eslintrc",
  ".prettierrc",
]);

const ALLOWED_FILENAMES = new Set([
  "Dockerfile",
  "Makefile",
  "Rakefile",
  "Gemfile",
  "Procfile",
  "Vagrantfile",
  "docker-compose.yml",
  "docker-compose.yaml",
]);

export function shouldIndexFile(filePath: string): boolean {
  // Check directory parts
  const parts = filePath.split("/");
  for (const part of parts.slice(0, -1)) {
    if (IGNORED_DIRS.has(part)) return false;
  }

  const fileName = parts[parts.length - 1];

  // Check ignored files
  if (IGNORED_FILES.has(fileName)) return false;

  // Check for minified files and source maps
  if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css")) return false;
  if (fileName.endsWith(".map")) return false;

  // Check for env files (except examples)
  if (fileName.startsWith(".env") && !fileName.includes("example")) return false;

  // Check allowed filenames
  if (ALLOWED_FILENAMES.has(fileName)) return true;

  // Check extension
  const ext = getExtension(fileName);
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;

  return false;
}

function getExtension(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return null;
  return fileName.slice(lastDot).toLowerCase();
}

export function detectLanguage(filePath: string): string | null {
  const ext = getExtension(filePath.split("/").pop() || "");
  const langMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".css": "css",
    ".scss": "scss",
    ".html": "html",
    ".sql": "sql",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".json": "json",
    ".md": "markdown",
    ".mdx": "mdx",
    ".sh": "shell",
    ".bash": "shell",
    ".dockerfile": "dockerfile",
  };
  return ext ? langMap[ext] || null : null;
}
