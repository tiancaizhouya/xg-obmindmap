# xg-obmindmap

Enhanced Obsidian mindmap plugin with multi-select workflows and keyboard-first editing.

- Repository: https://github.com/tiancaizhouya/xg-obmindmap
- Plugin ID: `xg-obmindmap`
- Author: `小刚刚`

## Key Features

- Mindmap/Markdown two-way editing
- Multi-select nodes with `Shift/Ctrl/Cmd + drag`
- Batch move and batch delete with single-step undo
- Drag-and-drop preview (before / after / child)
- Keyboard node operations:
  - `Enter`: create sibling
  - `Tab`: create child
  - `Delete/Backspace`: delete selected node(s)
  - `Space`: edit node
- Keyboard clipboard operations:
  - `Ctrl/Cmd + C`: copy selected node(s)
  - `Ctrl/Cmd + X`: cut selected node(s)
  - `Ctrl/Cmd + V`: paste to selected node
  - If no node is selected, paste to root node

## Manual Installation

1. Build or download release files.
2. Copy plugin folder to your vault:
   - `<vault>/.obsidian/plugins/xg-obmindmap`
3. Ensure these files exist in the folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. In Obsidian, enable community plugins and turn on `xg-obmindmap`.

## Development

```bash
npm install
npm run build
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
