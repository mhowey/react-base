const [major, minor] = process.versions.node.split('.').map(Number);
// Keep in sync with package.json engines and Vitest's supported runtimes.
const supported = (major === 22 && minor >= 12) || major === 24 || major >= 26;

if (!supported) {
  console.error(
    `Unsupported Node.js ${process.versions.node}. Use Node 22.12+, 24.x (recommended), or 26+. ` +
    'Node 20 can crash the native SQLite module. Run nvm install && nvm use, then npm ci.',
  );
  process.exit(1);
}