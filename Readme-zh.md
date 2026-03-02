# xg-obmindmap

面向 Obsidian 的增强脑图插件，支持多选与键盘优先操作。

- 仓库地址：https://github.com/tiancaizhouya/xg-obmindmap
- 插件 ID：`xg-obmindmap`
- 作者：`小刚刚`

## 主要功能

- 思维导图与 Markdown 双向编辑
- `Shift/Ctrl/Cmd + 鼠标拖拽` 框选多节点
- 多节点批量移动、批量删除（单次撤销）
- 拖拽预览提示（上方/下方/子节点）
- 键盘节点操作：
  - `Enter`：新增同级节点
  - `Tab`：新增子节点
  - `Delete/Backspace`：删除选中节点
  - `Space`：编辑节点
- 键盘剪贴板操作：
  - `Ctrl/Cmd + C`：复制选中节点
  - `Ctrl/Cmd + X`：剪切选中节点
  - `Ctrl/Cmd + V`：粘贴到当前选中节点
  - 未选中任何节点时，自动粘贴到根节点

## 手动安装

1. 构建或下载发布文件。
2. 将插件目录复制到：
   - `<vault>/.obsidian/plugins/xg-obmindmap`
3. 目录下至少包含：
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. 在 Obsidian 社区插件中启用 `xg-obmindmap`。

## 开发

```bash
npm install
npm run build
```

## 更新记录

见 [CHANGELOG.md](./CHANGELOG.md)。
