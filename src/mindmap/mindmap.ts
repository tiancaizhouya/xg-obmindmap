import INode, { INodeData } from './INode'
import Layout from './Layout'
import { Notice, Platform } from 'obsidian'
import SVG from 'svg.js'
import type { MindMapView } from '../MindMapView'
import { frontMatterKey, basicFrontmatter } from '../constants';
import Exec from './Execute'
import {uuid} from '../utils/uuid'

import importXmind  from './import/xmindZen'
import jsZip from 'jszip'
import { t } from 'src/lang/helpers'

let deleteIcon = '<svg class="icon" width="16px" height="16.00px" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path  d="M799.2 874.4c0 34.4-28 62.4-62.368 62.4H287.2a62.496 62.496 0 0 1-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.768 5.6 12.768 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48-39.2-87.2-87.2-87.2h-300a87.392 87.392 0 0 0-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6A137.6 137.6 0 0 0 287.2 1012h449.6a137.6 137.6 0 0 0 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.768-37.6-37.6-37.6-20.8 0-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.632-16.8 37.632-37.6v-400c0-20.8-16.8-37.6-37.632-37.6-20.768 0-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6" /></svg>';
let addIcon = '<svg class="icon" width="16px" height="16.00px" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path  d="M512 1024C230.4 1024 0 793.6 0 512S230.4 0 512 0s512 230.4 512 512-230.4 512-512 512z m0-960C265.6 64 64 265.6 64 512s201.6 448 448 448 448-201.6 448-448S758.4 64 512 64z"  /><path d="M800 544H224c-19.2 0-32-12.8-32-32s12.8-32 32-32h576c19.2 0 32 12.8 32 32s-12.8 32-32 32z"  /><path  d="M512 832c-19.2 0-32-12.8-32-32V224c0-19.2 12.8-32 32-32s32 12.8 32 32v576c0 19.2-12.8 32-32 32z"  /></svg>';
let tempDispLevel = 0;

interface Setting {
    theme?: string;
    canvasSize?: number;
    background?: string;
    fontSize?: number;
    color?: string,
    exportMdModel?: string,
    headLevel: number,
    layoutDirect: string,
    strokeArray?:any[],
    focusOnMove?: boolean
}

export default class MindMap {
    root: INode;
    status: string;
    appEl: HTMLElement;
    contentEL: HTMLElement;
    containerEL: HTMLElement;
    path?: string;
    editNode?: INode;
    selectNode?: INode;
    lastSelectedNode?: INode;
    // Multi-select support
    selectedNodes: Set<INode> = new Set();
    _selectionBox: HTMLElement = null;
    _isBoxSelecting: boolean = false;
    _boxStartX: number = 0;
    _boxStartY: number = 0;
    _boxStartClientX: number = 0;
    _boxStartClientY: number = 0;
    _isShiftPressed: boolean = false;
    _isCtrlPressed: boolean = false;
    _isMetaPressed: boolean = false;
    // Zoom panel
    _zoomPanel: HTMLElement;
    _zoomLabel: HTMLElement;
    _zoomSlider: HTMLInputElement;
    _zoomInBtn: HTMLElement;
    _zoomOutBtn: HTMLElement;
    setting: Setting;
    data: INodeData;
    drag?: boolean;
    startX?: number;
    startY?: number;
    dx?: number;
    dy?: number;
    mmLayout?: Layout;
    draw: any;
    edgeGroup: any;
    _nodeNum: number = 0;
    _tempNum: number = 0;
    view?: MindMapView;
    colors: string[] = [];
    _dragNode: INode;
    exec: Exec;
    scalePointer: number[] = [];
    mindScale = 100;
    timeOut: any = null;
    _indicateDom:HTMLElement;
    _menuDom:HTMLElement;
    _dragType:string='';
    _dropHintLine: HTMLElement = null;
    _dropHintLabel: HTMLElement = null;
    _dropTargetNode: INode = null;
    _left:number;
    _top:number;
    dispLevel:number;
    isComposing = false;
    isFocused = true;

    constructor(data: INodeData, containerEL: HTMLElement, setting?: Setting) {
        this.setting = Object.assign({
            theme: 'default',
            //canvasSize: 8000,
            canvasSize: 36000,
            fontSize: 16,
            background: 'transparent',
            color: 'inherit',
            exportMdModel: 'default',
            headLevel: 2,
            layoutDirect: ''
        }, setting || {});


        this.data = data;
        this.appEl = document.createElement('div');

        this.appEl.classList.add('mm-mindmap');
        this.appEl.classList.add(`mm-theme-${this.setting.theme}`);
        this.appEl.style.overflow = "auto";


        this.contentEL = document.createElement('div');
        this.contentEL.style.position = "relative";
        this.contentEL.style.width = "100%";
        this.contentEL.style.height = "100%";
        this.appEl.appendChild(this.contentEL);
        this.draw = SVG(this.contentEL).size('100%', '100%');

        this.setAppSetting();
        containerEL.appendChild(this.appEl);
        this.containerEL = containerEL;


        //layout direct
        this._indicateDom = document.createElement('div');
        this._indicateDom.classList.add('mm-node-layout-indicate');
        this._indicateDom.style.display='none';

        //menu
        this._menuDom = document.createElement('div');
        this._menuDom.classList.add('mm-node-menu');
        this._menuDom.style.display='none';
        this.setMenuIcon();

        this.contentEL.appendChild(this._indicateDom);
        this.contentEL.appendChild(this._menuDom);

        // Selection box for marquee/lasso selection
        this._selectionBox = document.createElement('div');
        this._selectionBox.classList.add('mm-selection-box');
        this._selectionBox.style.display = 'none';
        this._selectionBox.style.position = 'fixed';
        document.body.appendChild(this._selectionBox);

        // Drop preview UI
        this._initDropPreview();

        // Zoom control panel (appended to containerEL so it's not affected by transform)
        this._initZoomPanel();

        //history
        this.exec = new Exec();

        // link line
        this.edgeGroup = this.draw.group();

        this.appClickFn = this.appClickFn.bind(this);
        this.appDragstart = this.appDragstart.bind(this);
        this.appDragend = this.appDragend.bind(this);
        this.appDragover = this.appDragover.bind(this);
        this.appDblclickFn = this.appDblclickFn.bind(this);
        this.appMouseOverFn = this.appMouseOverFn.bind(this);
        this.appDrop = this.appDrop.bind(this);
        this.appKeyup = this.appKeyup.bind(this);
        this.compositionStart = this.compositionStart.bind(this);
        this.compositionEnd = this.compositionEnd.bind(this);

        this.appKeydown = this.appKeydown.bind(this);
        this.appMousewheel = this.appMousewheel.bind(this);
        this.appMouseMove = this.appMouseMove.bind(this);

        this.appMouseDown = this.appMouseDown.bind(this);
        this.appMouseUp = this.appMouseUp.bind(this);
        this.globalKeydown = this.globalKeydown.bind(this);
        this.globalKeyup = this.globalKeyup.bind(this);

        this.appFocusIn = this.appFocusIn.bind(this);
        this.appFocusOut = this.appFocusOut.bind(this);

        //custom event
        this.initNode = this.initNode.bind(this);
        this.renderEditNode = this.renderEditNode.bind(this);
        this.mindMapChange = this.mindMapChange.bind(this);

        this.initEvent();
        //this.center();
        this.dispLevel=0;
    }

    setMenuIcon(){
        var addNodeDom = document.createElement('span');
        var deleteNodeDom = document.createElement('span');
        addNodeDom.classList.add('mm-icon-add-node');
        deleteNodeDom.classList.add('mm-icon-delete-node');
        addNodeDom.innerHTML = addIcon;
        deleteNodeDom.innerHTML = deleteIcon;
        this._menuDom.appendChild(addNodeDom);
        this._menuDom.appendChild(deleteNodeDom);
    }

    _showNodeMenu(node: INode) {
        if (!node) {
            this._menuDom.style.display = 'none';
            return;
        }

        const box = node.getBox();
        const menuWidth = 56;
        const offset = 10;
        const isLeftBranch = node.direct == 'left';
        const left = isLeftBranch ? box.x - menuWidth - offset : box.x + box.width + offset;
        const top = box.y + box.height / 2 - 14;

        this._menuDom.style.left = `${left}px`;
        this._menuDom.style.top = `${top}px`;
        this._menuDom.style.display = 'block';
    }

    _initZoomPanel() {
        this._zoomPanel = document.createElement('div');
        this._zoomPanel.classList.add('mm-zoom-panel');

        this._zoomOutBtn = document.createElement('span');
        this._zoomOutBtn.classList.add('mm-zoom-btn');
        this._zoomOutBtn.textContent = '−';
        this._zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setScale('down');
        });

        this._zoomSlider = document.createElement('input') as HTMLInputElement;
        this._zoomSlider.type = 'range';
        this._zoomSlider.min = '20';
        this._zoomSlider.max = '300';
        this._zoomSlider.step = '10';
        this._zoomSlider.value = String(this.mindScale);
        this._zoomSlider.classList.add('mm-zoom-slider');
        this._zoomSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            const val = parseInt(this._zoomSlider.value);
            this.scale(val);
        });
        // Prevent zoom panel interactions from triggering canvas events
        this._zoomSlider.addEventListener('mousedown', (e) => e.stopPropagation());

        this._zoomInBtn = document.createElement('span');
        this._zoomInBtn.classList.add('mm-zoom-btn');
        this._zoomInBtn.textContent = '+';
        this._zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setScale('up');
        });

        this._zoomLabel = document.createElement('span');
        this._zoomLabel.classList.add('mm-zoom-label');
        this._zoomLabel.textContent = `${this.mindScale}%`;

        this._zoomPanel.appendChild(this._zoomOutBtn);
        this._zoomPanel.appendChild(this._zoomSlider);
        this._zoomPanel.appendChild(this._zoomInBtn);
        this._zoomPanel.appendChild(this._zoomLabel);

        // Prevent zoom panel clicks from propagating to canvas
        this._zoomPanel.addEventListener('mousedown', (e) => e.stopPropagation());
        this._zoomPanel.addEventListener('click', (e) => e.stopPropagation());

        this.containerEL.appendChild(this._zoomPanel);
    }

    _syncZoomUI() {
        if (this._zoomSlider) {
            this._zoomSlider.value = String(this.mindScale);
        }
        if (this._zoomLabel) {
            this._zoomLabel.textContent = `${this.mindScale}%`;
        }
    }

    _initDropPreview() {
        this._dropHintLine = document.createElement('div');
        this._dropHintLine.classList.add('mm-drop-preview-line');
        this._dropHintLine.style.display = 'none';
        this.contentEL.appendChild(this._dropHintLine);

        this._dropHintLabel = document.createElement('div');
        this._dropHintLabel.classList.add('mm-drop-preview-label');
        this._dropHintLabel.style.display = 'none';
        this.contentEL.appendChild(this._dropHintLabel);
    }

    _getDropPreviewMode(dragType: string) {
        if (!dragType) return '';
        if (dragType.indexOf('child') > -1) return 'child';
        if (dragType == 'top' || dragType == 'left') return 'before';
        return 'after';
    }

    _getDropHintText(mode: string) {
        if (mode == 'before') return t('Drop before node');
        if (mode == 'after') return t('Drop after node');
        return t('Drop as child node');
    }

    _clearDropPreview() {
        if (this._dropTargetNode) {
            this._dropTargetNode.containEl.classList.remove('mm-node-drop-target');
            this._dropTargetNode.containEl.classList.remove('mm-node-drop-child-target');
            this._dropTargetNode = null;
        }

        if (this._dropHintLine) {
            this._dropHintLine.style.display = 'none';
            this._dropHintLine.style.width = '0';
        }

        if (this._dropHintLabel) {
            this._dropHintLabel.style.display = 'none';
            this._dropHintLabel.textContent = '';
        }
    }

    _renderDropPreview(node: INode, dragType: string) {
        if (!node || !dragType) {
            this._clearDropPreview();
            return;
        }

        const mode = this._getDropPreviewMode(dragType);
        if (!mode) {
            this._clearDropPreview();
            return;
        }

        if (this._dropTargetNode && this._dropTargetNode !== node) {
            this._dropTargetNode.containEl.classList.remove('mm-node-drop-target');
            this._dropTargetNode.containEl.classList.remove('mm-node-drop-child-target');
        }

        node.containEl.classList.add('mm-node-drop-target');
        node.containEl.classList.remove('mm-node-drop-child-target');
        if (mode == 'child') {
            node.containEl.classList.add('mm-node-drop-child-target');
        }

        const box = node.getBox();
        const lineY = mode == 'before' ? box.y - 3 : box.y + box.height + 3;
        const labelX = Math.max(0, box.x + box.width / 2 - 64);

        this._dropHintLabel.textContent = this._getDropHintText(mode);
        this._dropHintLabel.style.display = 'block';
        this._dropHintLabel.style.left = `${labelX}px`;

        if (mode == 'child') {
            this._dropHintLine.style.display = 'none';
            this._dropHintLabel.style.top = `${box.y - 24}px`;
        } else {
            this._dropHintLine.style.display = 'block';
            this._dropHintLine.style.left = `${box.x - 6}px`;
            this._dropHintLine.style.top = `${lineY}px`;
            this._dropHintLine.style.width = `${box.width + 12}px`;
            this._dropHintLabel.style.top = `${lineY - 22}px`;
        }

        this._dropTargetNode = node;
    }

    _isAncestorNode(ancestor: INode, node: INode) {
        let p = node?.parent;
        while (p) {
            if (p == ancestor) return true;
            p = p.parent;
        }
        return false;
    }

    _getSelectedNodesInTreeOrder() {
        const selected = new Set(this.selectedNodes);
        const ordered: INode[] = [];
        this.traverseDF((node: INode) => {
            if (selected.has(node)) {
                ordered.push(node);
            }
        }, this.root, true);
        return ordered;
    }

    _getTopLevelSelectedNodes() {
        const selected = this._getSelectedNodesInTreeOrder();
        const selectedSet = new Set(selected);
        return selected.filter((node: INode) => {
            let p = node.parent;
            while (p) {
                if (selectedSet.has(p)) return false;
                p = p.parent;
            }
            return true;
        });
    }

    _deleteCurrentSelection() {
        let nodesToDelete: INode[] = [];
        if (this.selectedNodes.size > 0) {
            nodesToDelete = this._getTopLevelSelectedNodes();
        } else if (this.selectNode) {
            nodesToDelete = [this.selectNode];
        }

        nodesToDelete = nodesToDelete
            .filter((node: INode) => node && !node.data.isRoot && !node.data.isEdit)
            .reverse();

        if (!nodesToDelete.length) return false;

        this.exec.startBatch('delete-selected');
        try {
            nodesToDelete.forEach((node: INode) => {
                node.mindmap.execute("deleteNodeAndChild", { node });
            });
        } finally {
            this.exec.endBatch();
        }

        this.clearAllSelectedNodes();
        this._menuDom.style.display = 'none';
        return true;
    }

    _moveSelectedNodes(dropNode: INode, dragType: string) {
        const validNodes = this._getTopLevelSelectedNodes().filter((node: INode) => {
            if (!node || node.data.isRoot) return false;
            if (node == dropNode) return false;
            if (this._isAncestorNode(node, dropNode)) return false;
            return true;
        });

        if (!validNodes.length) return;

        const isChildMove = dragType.indexOf('child') > -1;
        const moveQueue = isChildMove ? validNodes : validNodes.slice().reverse();
        this.exec.startBatch('move-selected');
        try {
            moveQueue.forEach((node: INode) => {
                this.moveNode(node, dropNode, dragType, true);
            });
        } finally {
            this.exec.endBatch();
        }

        this.clearAllSelectedNodes();
    }

    _getClipboardSourceNodes() {
        if (this.selectedNodes.size > 0) {
            return this._getTopLevelSelectedNodes();
        }
        if (this.selectNode) {
            return [this.selectNode];
        }
        return [];
    }

    _copySelectionToClipboard() {
        const sourceNodes = this._getClipboardSourceNodes();
        if (!sourceNodes.length) return false;
        const payload = this.copyNodes(sourceNodes);
        if (!payload) return false;
        navigator.clipboard.writeText(payload);
        return true;
    }

    _cutSelectionToClipboard() {
        const sourceNodes = this._getClipboardSourceNodes();
        const removableNodes = sourceNodes.filter((node: INode) => node && !node.data.isRoot && !node.data.isEdit);
        if (!removableNodes.length) return false;
        const payload = this.copyNodes(removableNodes);
        if (!payload) return false;
        navigator.clipboard.writeText(payload);

        this.exec.startBatch('cut-selected');
        try {
            removableNodes
                .slice()
                .reverse()
                .forEach((node: INode) => {
                    node.mindmap.execute("deleteNodeAndChild", { node });
                });
        } finally {
            this.exec.endBatch();
        }

        this.clearAllSelectedNodes();
        this._menuDom.style.display = 'none';
        return true;
    }

    // === Multi-select helpers ===

    clearAllSelectedNodes() {
        this.selectedNodes.forEach(n => n.unSelect());
        this.selectedNodes.clear();
    }

    _addToSelection(node: INode) {
        node.containEl.classList.add('mm-node-select');
        node.containEl.setAttribute('draggable', 'true');
        this.selectedNodes.add(node);
    }

    _removeFromSelection(node: INode) {
        node.containEl.classList.remove('mm-node-select');
        node.containEl.setAttribute('draggable', 'false');
        this.selectedNodes.delete(node);
    }

    _toggleSelection(node: INode) {
        if (this.selectedNodes.has(node)) {
            this._removeFromSelection(node);
        } else {
            this._addToSelection(node);
        }
    }

    _selectRange(fromNode: INode, toNode: INode) {
        // Range select: select siblings between fromNode and toNode
        if (!fromNode || !toNode) return;
        if (!fromNode.parent || !toNode.parent) return;
        if (fromNode.parent !== toNode.parent) {
            // Not siblings, just add toNode
            this._addToSelection(toNode);
            return;
        }
        const siblings = fromNode.parent.children;
        const idx1 = siblings.indexOf(fromNode);
        const idx2 = siblings.indexOf(toNode);
        if (idx1 === -1 || idx2 === -1) return;
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        for (let i = start; i <= end; i++) {
            this._addToSelection(siblings[i]);
        }
    }

    _showSelectionBox() {
        if (this._selectionBox) {
            this._selectionBox.style.display = 'block';
        }
    }

    _hideSelectionBox() {
        if (this._selectionBox) {
            this._selectionBox.style.display = 'none';
            this._selectionBox.style.width = '0';
            this._selectionBox.style.height = '0';
        }
    }

    _updateSelectionBox(evt: MouseEvent) {
        const currentX = evt.clientX;
        const currentY = evt.clientY;
        const sx = this._boxStartClientX;
        const sy = this._boxStartClientY;

        const left = Math.min(sx, currentX);
        const top = Math.min(sy, currentY);
        const width = Math.abs(currentX - sx);
        const height = Math.abs(currentY - sy);

        this._selectionBox.style.left = `${left}px`;
        this._selectionBox.style.top = `${top}px`;
        this._selectionBox.style.width = `${width}px`;
        this._selectionBox.style.height = `${height}px`;
    }

    _finishBoxSelect() {
        // Get selection box rectangle in viewport coordinates
        const boxLeft = parseFloat(this._selectionBox.style.left) || 0;
        const boxTop = parseFloat(this._selectionBox.style.top) || 0;
        const boxWidth = parseFloat(this._selectionBox.style.width) || 0;
        const boxHeight = parseFloat(this._selectionBox.style.height) || 0;
        const boxRight = boxLeft + boxWidth;
        const boxBottom = boxTop + boxHeight;

        if (boxWidth < 5 && boxHeight < 5) return; // Too small, ignore

        // Traverse all visible nodes and check intersection
        this.traverseDF((node: INode) => {
            if (node.isHide) return;
            if (node.data.isRoot) return;
            const nb = node.containEl.getBoundingClientRect();
            // Check AABB intersection
            if (nb.x < boxRight && nb.x + nb.width > boxLeft &&
                nb.y < boxBottom && nb.y + nb.height > boxTop) {
                this._addToSelection(node);
            }
        });
    }

    setAppSetting() {
        this.appEl.style.width = `${this.setting.canvasSize}px`;
        this.appEl.style.height = `${this.setting.canvasSize}px`;
        this.contentEL.style.width = `100%`;
        this.contentEL.style.height = `100%`;
        //  this.contentEL.style.color=`${this.setting.color};`;
        this.contentEL.style.background = `${this.setting.background}`;
        this.contentEL.style.fontSize = `${this.setting.fontSize}px`;
    }
    //create node
    init(collapsedIds?: string[]) {
        var that = this;
        var data = this.data;
        var x = this.setting.canvasSize / 2 - 60;
        var y = this.setting.canvasSize / 2 - 200;
        var waitCollapseNodes:INode[]=[];

        function initNode(d: INodeData, isRoot: boolean, p?: INode) {
            that._nodeNum++;
            var n = new INode(d, that);
            // if (collapsedIds && collapsedIds.includes(n.getId())) {
            //     n.isExpand = false;
            // }
            // if (p && (!p.isExpand || p.isHide)) {
            //     n.isHide = true;
            // }

            that.contentEL.appendChild(n.containEl);
            if (isRoot) {
                n.setPosition(x, y);
                that.root = n;
                n.data.isRoot = true;
            } else {
                n.setPosition(0, 0);
                p.children.push(n);
                n.parent = p;
            }

            n.refreshBox();

            if(!d.expanded){
                waitCollapseNodes.push(n)
            }
            n.refreshBox();
            if (d.children && d.children.length) {
                d.children.forEach((dd: INodeData) => {
                    initNode(dd, false, n);
                });
            }
        }
        initNode(data, true);

        if(waitCollapseNodes.length){
            waitCollapseNodes.forEach(n=>{
                n.collapse();
            });
        }
    }

    traverseBF(callback: Function, node?: INode) {
        var array = [];
        array.push(node || this.root);
        var currentNode = array.shift();
        while (currentNode) {
            for (let i = 0, len = currentNode.children.length; i < len; i++) {
                array.push(currentNode.children[i]);
            }
            callback(currentNode);
            currentNode = array.shift();
        }
    }

    traverseDF(callback: Function, node?: INode, cbFirst?: boolean) {
        function recurse(currentNode: INode) {
            if (currentNode) {
                if (cbFirst) {
                    callback(currentNode);
                }
                if (currentNode.children) {
                    for (var i = 0, length = currentNode.children.length; i < length; i++) {
                        recurse(currentNode.children[i]);
                    }
                }
                if (!cbFirst) {
                    callback(currentNode);
                }
            }
        }
        recurse(node || this.root);

    }

    getNodeById(id: string) {
        var snode: INode = null;
        this.traverseDF((n: INode) => {
            if (n.getId() == id) {
                snode = n;
            }
        });

        return snode;
    }

    clearSelectNode() {
        if (this.selectNode) {
            this.lastSelectedNode = this.selectNode;
            this.selectNode.unSelect();
            this.selectNode = null
        }
        if (this.editNode) {
            if(this.editNode.data.isEdit){
                this.editNode.cancelEdit();
            }
            this.editNode = null;
        }
        // Clear multi-selection
        this.clearAllSelectedNodes();
    }


    initEvent() {
        this.appEl.addEventListener('click', this.appClickFn);
        this.appEl.addEventListener('mouseover', this.appMouseOverFn);
        this.appEl.addEventListener('dblclick', this.appDblclickFn);
        this.appEl.addEventListener('dragstart', this.appDragstart);
        this.appEl.addEventListener('dragover', this.appDragover);
        this.appEl.addEventListener('dragend', this.appDragend);
        this.appEl.addEventListener('drop', this.appDrop);
        document.addEventListener('keyup', this.appKeyup);
        document.addEventListener('keydown', this.appKeydown);
        document.addEventListener('compositionstart',this.compositionStart)
        document.addEventListener('compositionend',this.compositionEnd)
        document.body.addEventListener('mousewheel', this.appMousewheel);

        if(Platform.isDesktop){
            this.appEl.addEventListener('mousedown', this.appMouseDown);
            this.appEl.addEventListener('mouseup', this.appMouseUp);
            document.addEventListener('mouseup', this.appMouseUp);
        }

        document.addEventListener('keydown', this.globalKeydown, true);
        document.addEventListener('keyup', this.globalKeyup, true);

        this.appEl.addEventListener('mousemove', this.appMouseMove);

        this.containerEL.addEventListener('focusin', this.appFocusIn);
        this.containerEL.addEventListener('focusout', this.appFocusOut);
        //custom event
        this.on('initNode', this.initNode);
        this.on('renderEditNode', this.renderEditNode);
        this.on('mindMapChange', this.mindMapChange);

    }

    removeEvent() {
        this.appEl.removeEventListener('click', this.appClickFn);
        this.appEl.removeEventListener('dragstart', this.appDragstart);
        this.appEl.removeEventListener('dragover', this.appDragover);
        this.appEl.removeEventListener('dragend', this.appDragend);
        this.appEl.removeEventListener('dblClick', this.appDblclickFn);
        this.appEl.removeEventListener('mouseover', this.appMouseOverFn);
        this.appEl.removeEventListener('drop', this.appDrop);
        document.removeEventListener('keyup', this.appKeyup);
        document.removeEventListener('keydown', this.appKeydown);
        document.removeEventListener('compositionstart',this.compositionStart)
        document.removeEventListener('compositionend',this.compositionEnd)

        document.body.removeEventListener('mousewheel', this.appMousewheel);

        if(Platform.isDesktop){
            this.appEl.removeEventListener('mousedown', this.appMouseDown);
            this.appEl.removeEventListener('mouseup', this.appMouseUp);
            document.removeEventListener('mouseup', this.appMouseUp);
        }

        document.removeEventListener('keydown', this.globalKeydown, true);
        document.removeEventListener('keyup', this.globalKeyup, true);

        this.appEl.removeEventListener('mousemove', this.appMouseMove);

        this.containerEL.removeEventListener('focusin', this.appFocusIn);
        this.containerEL.removeEventListener('focusout', this.appFocusOut);

        this.off('initNode', this.initNode);
        this.off('renderEditNode', this.renderEditNode);
        this.off('mindMapChange', this.mindMapChange);
    }

    initNode(evt: CustomEvent) {
        this._tempNum++;
        //console.log(this._nodeNum,this._tempNum);

        if (this._tempNum == this._nodeNum) {
            this.refresh();
            //this.center();
        }
    }

    renderEditNode(evt: CustomEvent) {
        var node = evt.detail.node || null;
        node?.clearCacheData();
        this.refresh();
    }

    mindMapChange() {
        //console.log(this.view)
        this.view?.mindMapChange();
    }
    appFocusIn(evt: FocusEvent){
        setTimeout(() => {
            if (this.containerEL.contains(evt.relatedTarget as Node)) return;
            this.isFocused = true;
        }, 100);
    }
    appFocusOut(evt: FocusEvent){
        if (this.containerEL.contains(evt.relatedTarget as Node)) return;
        this.isFocused = false;
    }
    appKeydown(e: KeyboardEvent) {
        var keyCode = e.keyCode || e.which || e.charCode;
        const isDeleteKey = (keyCode == 46 || keyCode == 8 || e.key == 'Delete' || e.key == 'Backspace');
        if (!this.isFocused) {
            if (isDeleteKey && this.selectedNodes.size > 0) {
                e.preventDefault();
                e.stopPropagation();
                this._deleteCurrentSelection();
            }
            return;
        } // Check if Mindmap is in focus or not
        if (this.isComposing) return;
        var ctrlKey = e.ctrlKey || e.metaKey;
        var shiftKey = e.shiftKey;
        var altKey = e.altKey;

        if (ctrlKey && !shiftKey && !altKey) {
            const key = e.key.toLowerCase();
            const hasSelection = this.selectedNodes.size > 0 || !!this.selectNode;
            const isEditingNode = !!this.selectNode?.data?.isEdit;

            // Mod + C: copy selected/top-level selected nodes
            if (key == 'c' && hasSelection && !isEditingNode) {
                if (this._copySelectionToClipboard()) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // Mod + X: cut selected/top-level selected nodes
            if (key == 'x' && hasSelection && !isEditingNode) {
                if (this._cutSelectionToClipboard()) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // Mod + V: paste under selected node; fallback to root when no node selected
            if (key == 'v' && !isEditingNode) {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.readText().then((text) => {
                    this.pasteNode(text);
                });
                return;
            }
        }

        // if (ctrlKey) {                         // Shift -> Selecting
        //     // ctrl -> selecting
        //     this.selectingNodes = true;
        // } else {
        //     this.selectingNodes = false;
        // }

        if (!ctrlKey && !shiftKey && !altKey) { // No special key
            // Enter: add sibling node / end edit
            if (keyCode == 13 || e.key == 'Enter') {
                const node = this.selectNode;
                if (node) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!node.data.isEdit) {
                        if (node.parent) {
                            const newNode = node.mindmap.execute('addSiblingNode', {
                                parent: node.parent
                            });
                            if (newNode) {
                                this.moveNode(newNode, node, 'down', false);
                            }
                        }
                    } else {
                        this.clearSelectNode();
                        node.select();
                        node.mindmap.editNode = null;
                    }
                    this._menuDom.style.display = 'none';
                    return;
                }
            }

            // Delete/Backspace: delete selected node
            if (isDeleteKey) {
                if (this._deleteCurrentSelection()) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            // Space: enter edit mode
            if (keyCode == 32 || e.key == ' ') {
                const node = this.selectNode;
                if (node && !node.data.isEdit) {
                    e.preventDefault();
                    e.stopPropagation();
                    node.edit();
                    this._menuDom.style.display = 'none';
                    return;
                }
            }

            // Tab / Insert: add child node
            if (keyCode == 9 || keyCode == 45 || e.key == 'Tab' || e.key == 'Insert') {
                const node = this.selectNode;
                if (node && !node.data.isEdit) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!node.isExpand) {
                        node.expand();
                    }
                    node.mindmap.execute("addChildNode", { parent: node });
                    this._menuDom.style.display = 'none';
                    return;
                }
            }

            // // Space
            // if (keyCode == 32) {
            //     var node = this.selectNode;
            //     if (node && !node.data.isEdit) {
            //         e.preventDefault();
            //         e.stopPropagation();
            //         node.edit();
            //         this._menuDom.style.display = 'none';
            //     }
            // }


        }


        if (ctrlKey && !shiftKey && !altKey) {  // CTRL key
        //     //ctrl + y
        //     if (keyCode == 89) {
        //         e.preventDefault();
        //         e.stopPropagation();
        //         this.redo();
        //     }

        //     //ctrl + z
        //     if (keyCode == 90) {
        //         e.preventDefault();
        //         e.stopPropagation();
        //         this.undo();
        //     }
        }

            // Shift + F2 : Edit as space does
        // if (!ctrlKey && shiftKey && !altKey) {  // SHIFT key
        //     if (keyCode == 113) {
        //     // if (keyCode == 45) {
        //         var node = this.selectNode;
        //         if (node && !node.data.isEdit) {
        //             e.preventDefault();
        //             e.stopPropagation();
        //             if (!node.isExpand) {
        //                 node.expand();
        //             }
        //             if (!node.parent) return;
        //             node.mindmap.execute('addSiblingNode', {
        //                 parent: node.parent
        //             });
        //             this._menuDom.style.display='none';
        //         }
        //     }
        // }
    }

     compositionStart(e: KeyboardEvent) {

        this.isComposing = true;
     }
     compositionEnd(e: KeyboardEvent) {

        this.isComposing = false;
     }

    appKeyup(e: KeyboardEvent) {
        if (!this.isFocused) return; // Check if Mindmap is in focus or not
        var keyCode = e.keyCode || e.which || e.charCode;
        var ctrlKey = e.ctrlKey || e.metaKey;
        var shiftKey = e.shiftKey;
        var altKey = e.altKey;

        // if (ctrlKey) {                         // Shift -> Selecting
        //     // Ctrl -> selecting
        //     this.selectingNodes = true;
        // } else {
        //     this.selectingNodes = false;
        // }

        if (!ctrlKey && !shiftKey && !altKey) { // NO SPECIAL KEY
            // Enter
            // if (keyCode == 13 || e.key =='Enter') {
            //     var node = this.selectNode;
            //     e.preventDefault();
            //     e.stopPropagation();
            //     if(node) {// A node is selected
            //         if (!node.data.isEdit) {// Not editing a node => Add sibling node
            //             if (!node.isExpand) {
            //                 node.expand();
            //             }
            //             if (!node.parent) return;
            //             node.mindmap.execute('addSiblingNode', {
            //                 parent: node.parent
            //             });
            //             this._menuDom.style.display='none';
            //         }
            //         else {// Editing mode => end edit mode
            //             //node.cancelEdit();

            //             this.clearSelectNode();
            //             node.select();
            //             node.mindmap.editNode=null;
            //             //this.selectNode.unSelect();
            //         }
            //     }
            //     //else: no node selected: nothing to do
            // }

            //delete
            // if (keyCode == 46 || e.key == 'Delete' || e.key == 'Backspace') {
            //     var node = this.selectNode;
            //     if (node && !node.data.isRoot && !node.data.isEdit) {
            //         e.preventDefault();
            //         e.stopPropagation();
            //         node.mindmap.execute("deleteNodeAndChild", { node });
            //         this._menuDom.style.display='none';
            //     }
            //     //else: Deletion makes no sense
            // }


            // Tab / Insert
            // if (keyCode == 9 || keyCode == 45 || e.key == 'Tab') {
            //     e.preventDefault();
            //     e.stopPropagation();
            //     var node = this.selectNode;
            //     if(node) {
            //         if (!node.data.isEdit) {// Not editing
            //             if (!node.isExpand) {
            //                 node.expand();
            //             }
            //             node.mindmap.execute("addChildNode", { parent: node });
            //             this._menuDom.style.display='none';
            //         } else{
            //             // this.selectNode.unSelect();
            //             this.clearSelectNode();
            //             node.select();
            //             node.mindmap.editNode=null;
            //         }
            //     }
            //     //else: no node selected -> nothing to do
            // }

                // Escape
            if (keyCode == 27) {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if (node && node.data.isEdit) {
                    node.select();
                    node.mindmap.editNode = null;
                    node.cancelEdit();
                    this.undo();
                    //this.selectNode.unSelect();
                }
            }

            // up
            if (keyCode == 38 || e.key == 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if( node && !node.data.isEdit )
                {
                    var l_selectedNode = node;
                    while(  (this.selectNode == node)       &&
                            (l_selectedNode != this.root)   )
                    {
                        this._selectNode(l_selectedNode, "up");
                        l_selectedNode = l_selectedNode.parent;
                    }
                }
            }

            if (keyCode == 40 || e.key == 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if( node && !node.data.isEdit )
                {
                    var l_selectedNode = node;
                    while(  (this.selectNode == node)       &&
                            (l_selectedNode != this.root)   )
                    {
                        this._selectNode(l_selectedNode, "down");
                        l_selectedNode = l_selectedNode.parent;
                    }
                }
            }

            if (keyCode == 39 || e.key == 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if (node && !node.data.isEdit) {
                    var rootPos = this.root.getPosition();
                    var nodePos = node.getPosition();
                    if(rootPos.x > nodePos.x)
                    {// Node on left side of the mindmap
                        node.unSelect();
                        node.parent.select();
                    }
                    else
                    {
                        var node = this.selectNode;
                        node.mindmap.execute('expandNode', {
                            node
                        });
                        this._selectNode(node, "right");
                    }
                }
            }

            if (keyCode == 37 || e.key == 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if (node && !node.data.isEdit) {
                    var rootPos = this.root.getPosition();
                    var nodePos = node.getPosition();
                    if(rootPos.x < nodePos.x)
                    {// Node on right side of the mindmap
                        node.unSelect();
                        node.parent.select();
                    }
                    else
                    {
                        var node = this.selectNode;
                        node.mindmap.execute('expandNode', {
                            node
                        });
                        this._selectNode(node, "left");
                    }
                }
            }

            // Home : Select root node
            if (keyCode == 36) {
                e.preventDefault();
                e.stopPropagation();

                if( (!this.selectNode)          ||
                    (!this.selectNode.data.isEdit)   )
                {// No edition: select root node
                    if(this.selectNode)
                    { this.selectNode.unSelect(); }
                    this.root.select();
                    this.center();
                }
            }
        }


        if (ctrlKey && !shiftKey && !altKey) {  // CTRL KEY
            /*//ctr + /  (or Ctrl + NumpadDivide) toggle expand node
            // if ((keyCode == 191) || (keyCode == 111)) {
            //     var node = this.selectNode;
            //     this._toggleExpandNode(node);
            // }
            if ((keyCode == 191) || (keyCode == 111)) {
                var node = this.selectNode;
                if (node && !node.data.isEdit) {
                    if (node.isExpand) {
                        node.mindmap.execute('collapseNode', {
                            node
                        })
                    } else {
                        node.mindmap.execute('expandNode', {
                            node
                        })
                    }
                }
            }*/

            // Ctrl + B => Bold
            // if (keyCode == 66) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {
            //         var l_prefix_1 = "**";
            //         var l_prefix_2 = "__";
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in bold only the selected part
            //             var l_check_prefix = true;
            //             node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix);
            //         }

            //         else
            //         {// Set in bold the whole node
            //             this._formatNode(node, l_prefix_1, l_prefix_2);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }

            //         this.refresh();
            //         this.scale(this.mindScale);
            //     }
            //     //else: no node selected: nothing to do
            // }


            // Ctrl + I => Italic
            // if (keyCode == 73) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in italics only the selected part
            //             node.setSelectedText_italic();
            //         }

            //         else
            //         {// Set in italics the whole node
            //             var text = node.data.text;
            //             if( (  ((text.substring(0,1)=="*") ||
            //                     (text.substring(0,1)=="_") )        &&
            //                 (text.substring(0,2)!="**")             &&
            //                 (text.substring(0,2)!="__")             )   ||
            //                 (text.substring(0,3)=="***")                ||
            //                 (text.substring(0,3)=="___")                )
            //             {// Already italic
            //                 text = text.substring(1); // Remove leading * / _

            //                 if( (text.substring(text.length-1)=="*") ||
            //                     (text.substring(text.length-1)=="_") )   {
            //                     // Remove trailing * / _
            //                     text = text.substring(0,text.length-1);
            //                 }
            //                 // else: no trailing *
            //             }
            //             else {// Not in italic
            //                 text = "*"+text+"*"; // Use "*" to allow bold/italic change in whatever order
            //             }

            //             // Set in node text
            //             node.data.oldText = node.data.text;
            //             node.setText(text);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }

            //         this.refresh();
            //         this.scale(this.mindScale);
            //     }
            //     //else: no node selected: nothing to do
            // }


            // ctrl + E  center mindmap view
            // if (keyCode == 69) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     //this.center();
            //     this.centerOnNode(this.selectNode);
            // }


            // ctrl + Up: Move one node above
            // if (keyCode == 38 || e.key == 'ArrowUp') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected: select root node
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else if((!node.data.isEdit)  &&
            //             (!node.data.isRoot)  )
            //     {// The node can be moved
            //         var type='top';
            //         if(node.getIndex() == 0)
            //         {// First sibling: move BELOW "previous" (=last) node
            //             type='down';
            //         }
            //         //else: no special treatment
            //         this.moveNode(node, node.getPreviousSibling(), type);
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + Down: Move one step below
            // if (keyCode == 40 || e.key == 'ArrowDown') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected: select root node
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else if((!node.data.isEdit)  &&
            //             (!node.data.isRoot)  )
            //     {// The node can be moved
            //         var type='down';
            //         if(node.getIndex() == node.parent.children.length-1)
            //         {// Last sibling: move ABOVE "next" (=first) node
            //             type='top';
            //         }
            //         //else: no special treatment
            //         this.moveNode(node, node.getNextSibling(), type);
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + Left
            // if (keyCode == 37 || e.key == 'ArrowLeft') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected: select root node
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else {// Move current node as parent/child depending on the position
            //         var rootPos = this.root.getPosition();
            //         var nodePos = node.getPosition();
            //         if(rootPos.x < nodePos.x)
            //         {
            //             this._moveAsParent(node);
            //         }
            //         else
            //         {
            //             this._moveAsChild(node, node.getPreviousSibling());
            //         }
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + Right
            // if (keyCode == 39 || e.key == 'ArrowRight') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else {
            //         var rootPos = this.root.getPosition();
            //         var nodePos = node.getPosition();
            //         if(rootPos.x < nodePos.x)
            //         {
            //             // this.selectedNodes.forEach((n:INode) => {
            //             //     this._moveAsChild(n);
            //             // });
            //             this._moveAsChild(node, node.getPreviousSibling());
            //         }
            //         else
            //         {
            //             this._moveAsParent(node);
            //         }
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + J: Join with following node
            // if (keyCode == 74) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node)
            //     {  this.joinWithFollowingNode(node); }
            //     // else: No node selected: nothing to do
            // }



            // Ctrl + Home : Select root node
            if (keyCode == 36) {
                e.preventDefault();
                e.stopPropagation();

                if( (!this.selectNode)              ||
                    (!this.selectNode.data.isEdit)  )
                {// No edition: select root node
                    if(this.selectNode && !this.selectNode.data.isRoot)
                    {
                        this.selectNode.unSelect();
                        this.root.select();
                    }
                    this.center();
                }
            }
        }


        if (ctrlKey && shiftKey && !altKey) {   // CTRL + SHIFT key
            // //Shift + Ctrl + space: toggle expand node
            // if (keyCode == 32) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node)
            //     { this._toggleExpandNode(node); }
            // }


            // Ctrl + Shift + Z => Old text
            // if (keyCode == 90) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node) {
            //         // var text = (node.data.oldText as string);
            //         var text = (node.data.oldText);
            //         node.setText(text);
            //         e.preventDefault();
            //         e.stopPropagation();
            //         console.log(text+" / "+node.data.text);
            //     }
            // }


            // Ctrl + Shift + Home : Center map
            // if (keyCode == 36) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     this.center();
            // }

        }


        if (altKey && !ctrlKey && !shiftKey) {          // Alt key

            // Alt + H => Highlight
            // if (keyCode == 72) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {// There is a node selected: format
            //         var l_prefix_1 = "==";
            //         var l_prefix_2 = l_prefix_1;
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in bold only the selected part
            //             var l_check_prefix = true;
            //             node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix);
            //         }

            //         else
            //         {// Set in bold the whole node
            //             this._formatNode(node, l_prefix_1, l_prefix_2);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }
            //     }
            //     //else: no node selected: nothing to do
            // }


            // Alt + é => Strike through
            // if (keyCode == 50) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {// There is a node selected: format
            //         var l_prefix_1 = "~~";
            //         var l_prefix_2 = l_prefix_1;
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in bold only the selected part
            //             var l_check_prefix = true;
            //             node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix);
            //         }

            //         else
            //         {// Set in bold the whole node
            //             this._formatNode(node, l_prefix_1, l_prefix_2);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }
            //     }
            //     //else: no node selected: nothing to do
            // }


            // Alt + Home : Node info in console
            // if (keyCode == 36) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node) {
            //         console.log("Node idx: "+node.getIndex());
            //         console.log("Previous node idx: "+node.getPreviousSibling().getIndex());
            //         console.log("Next node idx: "+node.getNextSibling().getIndex());
            //         console.log("Node pos: x="+node.getPosition().x+" / y="+node.getPosition().y);
            //         console.log("Node dim: x="+node.getDimensions().x+" / y="+node.getDimensions().y);
            //         console.log("Canvas: "+this.setting.canvasSize);
            //         console.log("Disp scroll: x="+this.containerEL.scrollLeft+" / y="+this.containerEL.scrollTop);
            //         console.log("Disp client: x="+this.containerEL.clientWidth+" / y="+this.containerEL.clientHeight);

            //         //node.setText
            //     }
            // }


            // // Alt + PageUp: collapse one level from max displayed level
            // if (keyCode == 33) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     node = this.selectNode;
            //     if( (node)                                                  &&
            //         (this.getMaxNodeDisplayedLevel(node)>node.getLevel())   )
            //     {// Collapse only if current selected node would not be hidden
            //         this.setChildrenDisplayedLevel(this.getMaxNodeDisplayedLevel(node)-1);
            //         this.refresh();
            //         this.scale(this.mindScale);
            //         this.selectNode.select();
            //     }
            // }


            // // Alt + PageDn: expand one level
            // if (keyCode == 34) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     node = this.selectNode;
            //     if(node) {
            //         this.setChildrenDisplayedLevel(this.getMaxNodeDisplayedLevel(node)+1);
            //         this.refresh();
            //         this.scale(this.mindScale);
            //         this.selectNode.select();
            //     }
            // }


        }


        if (altKey && !ctrlKey && shiftKey) {           // Alt + Shift key

            // Alt + Shift + PageUp: collapse one level from current node
            // if (keyCode == 33) {
            //     if(this.selectNode) {
            //         this.setDisplayedLevel(this.selectNode.getLevel()-1);
            //         this.refresh();
            //         this.selectNode.parent.select();
            //     }
            // }


            // Alt + PageDn: expand one level
            // if (keyCode == 34) {
            //     if(this.selectNode) {
            //         this.setDisplayedLevel(this.selectNode.getLevel()+1);
            //         this.refresh();
            //         this.selectNode.select();
            //     }
            // }

        }


        if (altKey && ctrlKey && !shiftKey) {           // Alt + Ctrl key
            // Alt + Ctrl + S: Select node's text
            // if (keyCode == 83) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     let node = this.selectNode;
            //     if(node) {
            //         node.edit();
            //         node.selectText();
            //     }
            // }


        }


        if (altKey && ctrlKey && shiftKey) {            // Alt + Ctrl+ Shift key
            // None
            // if (keyCode == xx) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     let node = this.selectNode;
            //     if(node) {
            //         TBD
            //     }
            // }
        }


    }
    _hierarchySelectNode(node: INode, direct: string){
        if (!node) {
            return;
        }
        var viewportWidth = this.containerEL.clientWidth;
        var viewportHeight = this.containerEL.clientHeight;
        var diagonalViewport = Math.sqrt(viewportWidth * viewportWidth + viewportHeight * viewportHeight);
        const MAX_PARENT_DISTANCE = diagonalViewport / 5;
        var waitNode: INode = null;
        var nodePos = node.getPosition();
        // var mind = this;
        var rootPos = this.root.getPosition();
        var rootDirect = rootPos.x > nodePos.x ? 'right' : 'left';

        if (node === this.root) {
            waitNode = this.__selectChildren(node,direct);
            if (waitNode) {
                this.clearSelectNode();
                waitNode.select();
                return;
            }
        };

        if(direct === 'up'){
            if(node.parent){
                var indexOfNode = node.parent.children.indexOf(node);
                if (indexOfNode === 0 ) {
                    var parentPos = node.parent.getPosition();
                    var dx = Math.abs(parentPos.x - nodePos.x);
                    var dy = Math.abs(parentPos.y - nodePos.y);
                    var dis = Math.sqrt(dx * dx + dy * dy);
                    if(dis > MAX_PARENT_DISTANCE){
                        this._selectNode(node,direct);
                        return;
                    }
                    waitNode = node.parent;
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }else if (indexOfNode > 0){
                    waitNode = node.parent.children[indexOfNode - 1];
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            this._selectNode(node,direct);
        }
        else if(direct === 'down'){
            if(node.parent){
                var indexOfNode = node.parent.children.indexOf(node);
                if (indexOfNode === (node.parent.children.length - 1) ) {
                    var parentPos = node.parent.getPosition();
                    var dx = Math.abs(parentPos.x - nodePos.x);
                    var dy = Math.abs(parentPos.y - nodePos.y);
                    var dis = Math.sqrt(dx * dx + dy * dy);
                    if(dis > MAX_PARENT_DISTANCE){
                        this._selectNode(node,direct);
                        return;
                    }
                    waitNode = node.parent;
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }else if (indexOfNode < (node.parent.children.length - 1)){
                    waitNode = node.parent.children[indexOfNode + 1];
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            this._selectNode(node,direct);
        }
        else if(direct === 'right') {
            if(rootDirect === 'right' && node.parent){
                waitNode = node.parent;
                this.clearSelectNode();
                waitNode.select();
                return;
            }else{
                waitNode = this.__selectChildren(node,direct);
                if (waitNode) {
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            // this._selectNode(node,direct);
        }
        else if(direct === 'left') {
            if(rootDirect === 'left' && node.parent){
                waitNode = node.parent;
                this.clearSelectNode();
                waitNode.select();
                return;
            }else{
                waitNode = this.__selectChildren(node,direct);
                if (waitNode) {
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            // this._selectNode(node,direct);
        }
    }

    __selectChildren(node: INode, direct: string){
        if (!node) return;
        if (!node.isExpand) return;
        var minDis: number;
        var waitNode: INode = null;
        var pos = node.getPosition();
        if (node.children) {
            node.children.forEach(n => {
                var p = n.getPosition();
                var dx = Math.abs(p.x - pos.x);
                var dy = Math.abs(p.y - pos.y);
                var dis = Math.sqrt(dx * dx + dy * dy);
                var _helper = ()=>{
                    if (minDis) {
                        if (minDis > dis) {
                            minDis = dis;
                            waitNode = n;
                        }
                    } else {
                        minDis = dis;
                        waitNode = n;
                    }
                }
                switch (direct) {
                    case "right":
                        if (p.x > pos.x) _helper()
                        break;
                    case "left":
                        if (p.x < pos.x) _helper()
                        break;
                    case "up":
                        if (p.y < pos.y) _helper()
                        break;
                    case "down":
                        if (p.y > pos.y) _helper()
                        break;
                }
            });
        }
        return waitNode;
    }

    _formatNode(node: INode, i_prefix_1: string, i_prefix_2: string) {
        var text = node.data.text;

        if( (text.substring(0,2) == i_prefix_1)  ||
            (text.substring(0,2) == i_prefix_2)  )
        {// Prefix must be substracted, bold first
            text = text.substring(2); // Remove leading prefix

            if( (text.substring(text.length-2) == i_prefix_1)  ||
                (text.substring(text.length-2) == i_prefix_2)  )
            {// Suffix must be substracted
                text = text.substring(0,text.length-2);
            }
            // else: no trailing prefix
        }

        else if(    (text.substring(1,3) == i_prefix_1)  ||
                    (text.substring(1,3) == i_prefix_2)  )
        {// Prefix must be substracted, italic (?) first
            text = text[0] + text.substring(3); // Remove prefix

            if( (text.slice(-3, -1) == i_prefix_1)   ||
                (text.slice(-3, -1) == i_prefix_2)   )
            {// Suffix must be substracted
                text = text.substring(0,text.length-3) +
                text.slice(-1);
            }
            // else: no trailing prefix
        }

        else if(    (text.substring(2,4) == i_prefix_1)  ||
                    (text.substring(2,4) == i_prefix_2)  )
        {// Prefix must be substracted, highlight (?) first
            text = text.substring(0,2) + text.substring(4); // Remove prefix

            if( (text.slice(-4, -2) == i_prefix_1)   ||
                (text.slice(-4, -2) == i_prefix_2)   )
            {// Suffix must be substracted
                text = text.substring(0,text.length-4) +
                text.slice(-2);
            }
            // else: no trailing prefix
        }

        else {// No pre-/suf-fix: add it
            text = i_prefix_1+text+i_prefix_1;
        }

        // Set the text in the node
        node.mindmap.execute('changeNodeText',{
            node:node,
            text:text,
            oldText:node.data.text
        });
        // node.data.oldText = node.data.text;
        // node.setText(text);
        node.select();
    }


    _moveAsParent(node: INode) {
        if( (!node.data.isEdit)     &&
            (!node.data.isRoot)     &&
            (node.getLevel() > 1)   )
        {// The node can be moved
            this.moveNode(node, node.parent, 'down');
        }

        return;
    }


    _moveAsChild(movedNode: INode, newParentNode: INode) {
        if( (!movedNode.data.isEdit)  &&
            (!movedNode.data.isRoot)  )
        {// The node can be moved
            this.moveNode(movedNode, newParentNode, 'child-right');
        }


        return;
    }


    _toggleExpandNode(node: INode) {
        if (node && !node.data.isEdit) {
            if (node.isExpand) {
                node.mindmap.execute('collapseNode', {
                    node
                });
            }
            else {
                node.mindmap.execute('expandNode', {
                    node
                });
            }
        }

        return;
    }


    _selectNode(node: INode, direct: string) {
        if (!node) {
            return;
        }

        var minDis: number;
        var waitNode: INode = null;
        var pos = node.getPosition();
        var rootPos = this.root.getPosition();
        var level = node.getLevel();
        var mind = this;


        mind.traverseDF((n: INode) => {
            var p = n.getPosition();
            var l = n.getLevel();
            var dx = Math.abs(p.x - pos.x);
            var dy = Math.abs(p.y - pos.y);
            var dis = Math.sqrt(dx * dx + dy * dy);
            switch (direct) {
                case "right":
                    if( ((pos.x>this.root.getPosition().x)  &&
                         (l == level+1)                     )   ||
                        ((pos.x<this.root.getPosition().x)  &&
                         (l == level-1)                     )   ||
                        ((level == 0)                       &&
                         l==1)                                  )
                    {// The tested node is at the correct level
                        if( (n == node.parent) || (node == n.parent) )
                        {// Move only within same lineage
                            if (p.x > pos.x) {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
                case "left":
                    if( ((pos.x>this.root.getPosition().x)  &&
                         (l == level-1)                     )   ||
                        ((pos.x<this.root.getPosition().x)  &&
                         (l == level+1)                     )   ||
                         ((level == 0)                      &&
                          l==1)                                 )
                    {// The tested node is at the correct level
                        if( (n == node.parent) || (node == n.parent) )
                        {// Move only within same lineage
                            if (p.x < pos.x) {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
                case "up":
                    if( (n.isShow())                &&
                        (((pos.x<rootPos.x) &&
                          (p.x<rootPos.x)   )   ||
                         ((pos.x>rootPos.x) &&
                          (p.x>rootPos.x)   )   )   )
                    {// Move only on shown nodes + on the same side of the root
                        if (p.y < pos.y) {
                            if(level == l)
                            {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
                case "down":
                    if( (n.isShow())                &&
                        (((pos.x<rootPos.x) &&
                          (p.x<rootPos.x)   )   ||
                         ((pos.x>rootPos.x) &&
                          (p.x>rootPos.x)   )   )   )
                    {// Move only on shown nodes + on the same side of the root
                        if (p.y > pos.y) {
                            if(level == l)
                            {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
            }
        });

        if (waitNode) {
            mind.clearSelectNode();
            waitNode.select();
        }
    }

    appClickFn(evt: MouseEvent) {
        this.isFocused = true;
        var targetEl = evt.target as HTMLElement;

        if (targetEl) {

            if (targetEl.tagName == 'A' && targetEl.hasClass("internal-link")) {
                evt.preventDefault();
                var targetEl = evt.target as HTMLElement;
                var href = targetEl.getAttr("href");
                if(href){
                    this.view.app.workspace.openLinkText(
                        href,
                        this.view.file.path,
                        evt.ctrlKey || evt.metaKey
                    );
                }
            }

            if (targetEl.hasClass('mm-node-bar')) {
                evt.preventDefault();
                evt.stopPropagation();
                var id = targetEl.closest('.mm-node').getAttribute('data-id');
                var node = this.getNodeById(id);

                if (node.isExpand) {
                    node.mindmap.execute('collapseNode', {
                        node
                    });
                } else {
                    node.mindmap.execute('expandNode', {
                        node
                    });
                }
                return
            }

            if(targetEl.closest('.mm-node-menu')){
                 if(targetEl.closest('.mm-icon-add-node')){
                      var selectNode = this.selectNode;
                      if(selectNode){
                         selectNode.mindmap.execute("addChildNode", { parent: selectNode });
                         this._menuDom.style.display='none';
                      }
                 }

                 if(targetEl.closest('.mm-icon-delete-node')){
                    var selectNode = this.selectNode;
                    if(selectNode && !selectNode.data.isRoot){
                       selectNode.mindmap.execute("deleteNodeAndChild", { node: selectNode });
                       this._menuDom.style.display='none';
                    }
                 }
                 return;
            }

            if (targetEl.closest('.mm-node')) {
                var id = targetEl.closest('.mm-node').getAttribute('data-id');
                var node = this.getNodeById(id);

                if (evt.ctrlKey || evt.metaKey) {
                    // Ctrl/Cmd + click: toggle multi-select
                    this._toggleSelection(node);
                    // Also set as primary selectNode for reference
                    this.selectNode = node;
                    this.lastSelectedNode = node;
                    this._menuDom.style.display='none';
                } else if (evt.shiftKey) {
                    // Shift + click: range select siblings
                    const anchor = this.lastSelectedNode || this.selectNode;
                    if (anchor) {
                        this._selectRange(anchor, node);
                    } else {
                        this._addToSelection(node);
                    }
                    this.selectNode = node;
                    this._menuDom.style.display='none';
                } else {
                    // Normal click: clear all, select single
                    if (!node.isSelect) {
                        this.clearSelectNode();
                        this.selectNode = node;
                        this.selectNode?.select();
                    }
                    this._showNodeMenu(node);
                }
            } else {
                this.clearSelectNode();
                this._menuDom.style.display='none';
            }
        }
    }

    appDragstart(evt: MouseEvent) {
        evt.stopPropagation();
        this.startX = evt.pageX;
        this.startY = evt.pageY;
        this._clearDropPreview();
        if (evt.target instanceof HTMLElement) {
            if (evt.target.closest('.mm-node')) {
                var id = evt.target.closest('.mm-node').getAttribute('data-id');
                this._dragNode = this.getNodeById(id);
                this.drag = true;
            }
        }
    }

    appDragend(evt: MouseEvent) {
        this.drag = false;
        this._indicateDom.style.display = 'none'
        this._menuDom.style.display = 'none';
        this._clearDropPreview();
    }

    appDragover(evt: MouseEvent) {
        evt.preventDefault();
        evt.stopPropagation();
        var target =evt.target as HTMLElement;
        var x = evt.pageX;
        var y = evt.pageY;

        if (this.drag) {
            this.dx = x - this.startX;
            this.dy = y - this.startY;
        }

        if(target.closest('.mm-node')){
            var nodeId =target.closest('.mm-node').getAttribute('data-id');
            var node = this.getNodeById(nodeId);
            const invalidSelfDrop = node == this._dragNode;
            const invalidSelectedTarget = this.selectedNodes.size > 1 &&
                this.selectedNodes.has(this._dragNode) &&
                this.selectedNodes.has(node);
            if (invalidSelfDrop || invalidSelectedTarget) {
                this._indicateDom.style.display = 'none';
                this._clearDropPreview();
                return;
            }
            var box = node.getBox();
            this._dragType = this._getDragType(node, x, y);
            this._indicateDom.style.display = 'block';
            this._indicateDom.style.left = box.x + box.width / 2 - 40 / 2 + 'px';
            this._indicateDom.style.top = box.y - 90 + 'px';
            this._indicateDom.className = 'mm-node-layout-indicate';

            if( this._dragType == 'top') {
                this._indicateDom.classList.add('mm-arrow-top');
            } else if ( this._dragType == 'down') {
                this._indicateDom.classList.add('mm-arrow-down');
            } else if ( this._dragType == 'left') {
                this._indicateDom.classList.add('mm-arrow-left');
            } else if ( this._dragType == 'right') {
                this._indicateDom.classList.add('mm-arrow-right');
            } else {
                this._indicateDom.classList.add('drag-type');
                var arr = this._dragType.split('-');
                if (arr[1]) {
                    this._indicateDom.classList.add('mm-arrow-' + arr[1]);
                } else {
                    this._indicateDom.classList.add('mm-arrow-right');
                }
            }
            this._renderDropPreview(node, this._dragType);
        }else{
            this._indicateDom.style.display = 'none';
            this._clearDropPreview();
        }

    }

    _getDragType(node:INode, x:number, y:number) {
        if (!node) return;

        var box = node.contentEl.getBoundingClientRect();

        box.x = box.x
        box.y = box.y;

        var direct = node.direct;
        switch (direct) {
            case 'right':
                if (y < box.y + box.height / 2 && x < box.x + box.width / 4 * 3) {
                    return 'top'
                }
                if (y > box.y + box.height / 2 && x < box.x + box.width / 4 * 3) {
                    return 'down'
                }
                return 'child-right'
            case 'left':
                if (y < box.y + box.height / 2 && x > box.x + box.width / 4) {
                    return 'top'
                }
                if (y > box.y + box.height / 2 && x > box.x + box.width / 4) {
                    return 'down'
                }

                return 'child-left'

            case 'top':
            case 'up':

                if (x < box.x + box.width / 4) {
                    return 'left'
                }
                if (x > box.x + box.width / 4 * 3) {
                    return 'right'
                }

                return 'child-top'
            case 'down':
            case 'bottom':
                if (x < box.x + box.width / 4) {
                    return 'left'
                }
                if (x > box.x + box.width / 4 * 3) {
                    return 'right'
                }
                return 'child-down'
            default:
                return 'child';

        }
    }

    appDrop(evt: any) {
        if (evt.target instanceof HTMLElement) {
            if (evt.target.closest('.mm-node')) {
                evt.preventDefault();
                var dropNodeId = evt.target.closest('.mm-node').getAttribute('data-id');
                var dropNode = this.getNodeById(dropNodeId);
                const isDroppingOnSelected = this.selectedNodes.size > 1 &&
                    this.selectedNodes.has(this._dragNode) &&
                    this.selectedNodes.has(dropNode);
                if (isDroppingOnSelected) {
                    this._indicateDom.style.display = 'none';
                    this._clearDropPreview();
                    return;
                }
                if (this._dragNode.data.isRoot) {

                } else {
                    if (evt.ctrlKey) {// Ctrl key pressed: copy the node
                        let copiedNode = this.copyNode(this._dragNode);
                        dropNode.select();
                        this.pasteNode(copiedNode);

                    }
                    else {
                        // Batch move: if dragged node is in selectedNodes, move all selected
                        if (this.selectedNodes.size > 1 && this.selectedNodes.has(this._dragNode)) {
                            this._moveSelectedNodes(dropNode, this._dragType);
                        } else {
                            // Single node move (original behavior)
                            this.moveNode(this._dragNode, dropNode, this._dragType);
                        }
                    }
                }
            }
        }

        var files = evt.dataTransfer.files;
            if(files.length){
                  var f = files[0];
                  if(f.name.toLowerCase().endsWith('.xmind')){
                   try{
                       var me = this;
                       var reader = new FileReader();
                       reader.onload=()=>{
                            jsZip.loadAsync(reader.result).then((e)=>{
                               var files = e.files;
                               for (var k in files) {
                                  if (k == "content.json") {
                                   files[k].async("text").then((res) => {
                                     var mindData = JSON.parse(res);
                                       var data:any = importXmind(mindData[0]);



                                       me.clearNode();
                                       me.data = data.basicData;
                                       me.init();
                                       setTimeout(()=>{
                                           me.center();
                                           me.mindMapChange();
                                       },100);
                                   });
                                 }
                               }
                            })
                       }
                       reader.readAsArrayBuffer(f);
                   }catch(err){
                      new Notice('Parse xmind error')
                   }
                  }


       }

        this._indicateDom.style.display = 'none'
        this._menuDom.style.display = 'none';
        this._clearDropPreview();
    }

    appMouseOverFn(evt: MouseEvent) {
        const targetEl = evt.target as HTMLElement;

        if (targetEl.tagName !== "A") return;

        if (targetEl.hasClass("internal-link")) {
            this.view.app.workspace.trigger("hover-link", {
                event: evt,
                source: frontMatterKey,
                hoverParent: this.view,
                targetEl,
                linktext: targetEl.getAttr("href"),
                sourcePath: this.view.file.path,
            });
        }
    }

    appMouseMove(evt: MouseEvent) {
        // If box selecting, update the selection rectangle and skip other logic
        if (this._isBoxSelecting) {
            this._updateSelectionBox(evt);
            return;
        }

        const targetEl = evt.target as HTMLElement;
        this.scalePointer = [];
        this.scalePointer.push(evt.offsetX, evt.offsetY);
        if (targetEl.closest('.mm-node')) {
            var id = targetEl.closest('.mm-node').getAttribute('data-id');
            var node = this.getNodeById(id);
            if (node) {
                var box = node.getBox();
                this.scalePointer = [];
                this.scalePointer.push(box.x + box.width / 2, box.y + box.height / 2);
            }
        }else{
            if(this.drag){
                this.containerEL.scrollLeft = this._left - (evt.pageX - this.startX);
                this.containerEL.scrollTop = this._top - (evt.pageY - this.startY);
            }
        }
    }

    appMouseDown(evt:MouseEvent){
        this.isFocused = true;
        const targetEl = evt.target as HTMLElement;
        if(!targetEl.closest('.mm-node')){
            const isShift = evt.shiftKey || evt.getModifierState('Shift') || this._isShiftPressed;
            const isCtrl = evt.ctrlKey || evt.getModifierState('Control') || this._isCtrlPressed;
            const isMeta = evt.metaKey || evt.getModifierState('Meta') || this._isMetaPressed;
            const isBoxSelectModifier = isShift || isCtrl || isMeta;
            if (isBoxSelectModifier) {
                // Shift/Ctrl/Cmd + drag on empty area = box selection mode
                this._isBoxSelecting = true;
                const rect = this.containerEL.getBoundingClientRect();
                this._boxStartX = evt.pageX - rect.left + this.containerEL.scrollLeft;
                this._boxStartY = evt.pageY - rect.top + this.containerEL.scrollTop;
                this._boxStartClientX = evt.clientX;
                this._boxStartClientY = evt.clientY;
                this._showSelectionBox();
                evt.preventDefault();
            } else {
                // Normal drag: pan canvas
                this.drag = true;
                this.startX = evt.pageX;
                this.startY = evt.pageY;
                this._left = this.containerEL.scrollLeft;
                this._top = this.containerEL.scrollTop;
            }
        }
    }

    globalKeydown(evt: KeyboardEvent) {
        if (evt.key == 'Shift') this._isShiftPressed = true;
        if (evt.key == 'Control') this._isCtrlPressed = true;
        if (evt.key == 'Meta') this._isMetaPressed = true;
    }

    globalKeyup(evt: KeyboardEvent) {
        if (evt.key == 'Shift') this._isShiftPressed = false;
        if (evt.key == 'Control') this._isCtrlPressed = false;
        if (evt.key == 'Meta') this._isMetaPressed = false;
    }

    appMouseUp(evt:MouseEvent){
        if (this._isBoxSelecting) {
            this._isBoxSelecting = false;
            this._finishBoxSelect();
            this._hideSelectionBox();
        }
        this.drag = false;
    }

    appDblclickFn(evt: MouseEvent) {
        if (evt.target instanceof HTMLElement) {

            if (evt.target.hasClass('mm-node-bar')) {
                evt.preventDefault();
                evt.stopPropagation();
                return;
            }
            if (evt.target.closest('.mm-node') instanceof HTMLElement) {
                var id = evt.target.closest('.mm-node').getAttribute('data-id');
                this.selectNode = this.getNodeById(id);
                if (!this.editNode || (this.editNode && this.editNode != this.selectNode)) {
                    this.selectNode?.edit();
                    this.editNode = this.selectNode;
                    this._menuDom.style.display='none';
                }
            }
        }
    }

    appMousewheel(evt: any) {
        // if(!evt) evt = window.event;
        var ctrlKey = evt.ctrlKey || evt.metaKey;
        var delta;
        if (evt.wheelDelta) {
            //IE、chrome  -120
            delta = evt.wheelDelta / 120;
        } else if (evt.detail) {
            //FF 3
            delta = -evt.detail / 3;
        }

        if (delta) {
            if (delta < 0) {
                if (ctrlKey) {
                    this.setScale("down");
                }
            } else {
                if (ctrlKey) {
                    this.setScale("up");
                }
            }
        }
    }

    clearNode() {
        //delete node
        this.traverseBF((n: INode) => {
            this.contentEL.removeChild(n.containEl);
        });

        //delete line
        if (this.mmLayout) {
            this.mmLayout.svgDom?.clear();
        }

    }

    clear() {
        this.clearNode();
        this.removeEvent();
        if (this._selectionBox?.parentElement) {
            this._selectionBox.parentElement.removeChild(this._selectionBox);
        }
        this.draw?.clear();
    }
    //get node list rect point
    getBoundingRect(list: INode[]) {
        var box = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            right: 0,
            bottom: 0
        };
        list.forEach((item, i) => {
            var b = item.getBox();
           // console.log(b.x,b.y);
            if (i == 0) {
                box.x = b.x;
                box.y = b.y;
                box.right = b.x + b.width;
                box.bottom = b.y + b.height;
            } else {
                if (b.x < box.x) {
                    box.x = b.x
                }
                if (b.y < box.y) {
                    box.y = b.y
                }
                if (b.x + b.width > box.right) {
                    box.right = b.x + b.width;
                }
                if (b.y + b.height > box.bottom) {
                    box.bottom = b.y + b.height;
                }
            }
        });

        box.width = box.right - box.x;
        box.height = box.bottom - box.y;

        return box;
    }

    moveNode(dragNode: INode, dropNode: INode, type:string, setInHistory: boolean = true) {

        if (dragNode == dropNode || dragNode.data.isRoot) {
            return
        }

        var flag = false;
        var p = dropNode.parent;
        while (p) {
            if (p == dragNode) {
                flag = true;
                break;
            }
            p = p.parent;
        }
        if (flag) {  //parent  can not change to child
            return;
        }

        dropNode.clearCacheData();
        dragNode.clearCacheData();

        if (type == 'right' || type == 'left'){
            if (!dropNode.isExpand) {
                dropNode.expand();
            }
        }

        if (type == 'top' || type == 'left' ||type == 'down' || type == 'right') {
            this.execute('moveNode', { type: 'siblings', node: dragNode, oldParent: dragNode.parent, dropNode, direct: type, inHistory: setInHistory})
        }
        else if (type.indexOf('child') > -1) {
            var typeArr = type.split('-');
            if (typeArr[1]) {
                this.execute('moveNode', { type: 'child', node: dragNode, oldParent: dragNode.parent, parent: dropNode, direct: typeArr[1], inHistory: setInHistory })
            }
            else {
                this.execute('moveNode', { type: 'child', node: dragNode, oldParent: dragNode.parent, parent: dropNode, inHistory: setInHistory });
            }
        }

       // this.execute('moveNode', { type: 'child', node: dragNode, oldParent: dragNode.parent, parent: dropNode })
    }


    // Move all the current node's siblings as this node's children
    moveAllSiblingsAsChildren(node: INode) {
        var sibs = node.getSiblings();
        sibs.forEach((sib) => {
            this._moveAsChild(sib, node);
        })

        return;
    }


    // Move the current node's next siblings as this node's children
    moveNextSiblingsAsChildren(node: INode) {
        var sibs = node.getAllNextSiblings();
        sibs.forEach((sib) => {
            this._moveAsChild(sib, node);
        })

        return;
    }


    // Join the current node with the following node
    joinWithFollowingNode(node: INode, in_asCitation: Boolean) {
        let joinedNode = node.getNextSibling();

        // Set node's text, except for the starting emoticon and finishing link (if any)
        const emoticonRegex = /^[\u263a-\u27bf\u{1f300}-\u{1f9ff}]/u;
        // Regex to match links with the link pattern [🔗](...)
        // [🔗] is constant and (...) is any content inside parentheses.
        const linkRegex = /\[🔗\]\(.*\.pdf\)/g;
        const pageRegex = / \(p\. \d+\)$/;
        // Remove the emoticon and links from the text
        let node_text = (node.data.text)
            .replace(linkRegex, "")        // Remove all links of the form [🔗](...)
            .trimEnd()                     // Trim ending whitespace
            .replace(pageRegex, "")        // Remove last page of the form (p. ...)
        let joinedText = joinedNode.data.text
            .replace(emoticonRegex, "")    // Remove starting emoticon
            .trimStart();                  // Trim leading whitespace

        let l_middle_text = " "
        if (in_asCitation)
        { l_middle_text += "(…)"
        }
        l_middle_text += "<br>"
        node.setText(node_text + l_middle_text + joinedText);

        // let joinedText = joinedNode.data.text.replace(emoticonRegex, "").trimStart();
        // node.setText(node.data.text + " (…) " + joinedText);
        // node.setText(node.data.text + " (…) " + joinedNode.data.text);


        if(!joinedNode.isLeaf())
        {// The joined node has children: copy them to the current node
            joinedNode.children.forEach((n) => {
                //this._moveAsChild(n, node);
                let copiedNode = this.copyNode(n);
                this.selectNode.unSelect();
                node.select();
                this.pasteNode(copiedNode);
            });
        }

        // Delete joined node
        this.removeNode(joinedNode);

        this.clearSelectNode();
        this.refresh();
        this.scale(this.mindScale);
        node.select();
    }

    //execute cmd , store history
    execute(name: string, data?: any) {
        return this.exec.execute(name, data);
    }
    undo() {
        this.exec.undo();
    }

    redo() {
        this.exec.redo();
    }

    addNode(node: INode, parent?: INode, index = -1) {
        if (parent) {
            parent.addChild(node, index);
            if (parent.direct) {
                node.direct = parent.direct;
            }
            this._addNodeDom(node);
            node.clearCacheData();
        }
    }

    _addNodeDom(node: INode) {
        this.traverseBF((n: INode) => {
            if (!this.contentEL.contains(n.containEl)) {
                this.contentEL.appendChild(n.containEl);
            }
        }, node);
    }

    removeNode(node: INode) {
        if (node.parent) {
            var p = node.parent;
            var i = node.parent.removeChild(node);
            this._removeChildDom(node);
            p.clearCacheData();
            return i;
        } else {
            this._removeChildDom(node);
            return -1;
        }

    }

    _removeChildDom(node: INode) {
        this.traverseBF((n: INode) => {
            if (this.contentEL.contains(n.containEl)) {
                this.contentEL.removeChild(n.containEl);
            }
        }, node);
    }

    //layout
    layout() {
        if (!this.mmLayout) {
            this.mmLayout = new Layout(this.root, this.setting.layoutDirect||'mind map', this.colors);
            // Select and center on the mindmap's root when opening it
            this.root.select();
            this.centerOnNode(this.root);
            return;
        }

        this.mmLayout.layout(this.root, this.setting.layoutDirect || this.mmLayout.direct || 'mind map');

    }

    refresh() {
        this.layout();
    }

    emit(name: string, data?: any) {
        var evt = new CustomEvent(name, {
            detail: data || {}
        });
        this.appEl.dispatchEvent(evt);
    }

    on(name: string, fn: any) {
        this.appEl.addEventListener(name, fn);
    }

    off(name: string, fn: any) {
        if (name && fn) {
            this.appEl.removeEventListener(name, fn);
        }
    }

    center() {
        //console.log("Center mindmap")
        this._setMindScalePointer(this.root);
        var oldScale = this.mindScale;
        this.scale(100);

        var w = this.containerEL.clientWidth;
        var h = this.containerEL.clientHeight;
        this.containerEL.scrollTop = this.setting.canvasSize / 2 - h / 2 - 60;
        this.containerEL.scrollLeft = this.setting.canvasSize / 2 - w / 2 + 30;

        this.scale(oldScale);
    }


    centerOnNode(node: INode) {
        if(node == null)
        {//No node given as input argument
            this.center();
        } else {
            //console.log("Center mindmap on node "+node.getId())
            this._setMindScalePointer(node);
            var oldScale = this.mindScale;
            this.scale(100);

            var w = this.containerEL.clientWidth;
            var h = this.containerEL.clientHeight;
            let pos_x = node.getPosition().x;
            let pos_y = node.getPosition().y;
            let dim_x = node.getDimensions().x;
            let dim_y = node.getDimensions().y;
            //this.containerEL.scrollTop = this.setting.canvasSize / 2 - h / 2 - 60 ;
            //this.containerEL.scrollLeft = this.setting.canvasSize / 2 - w / 2 + 30 ;
            this.containerEL.scrollTop  = pos_y - (h/2 - dim_y/2) + 90;
            //this.containerEL.scrollLeft = pos_x - (w/2 - dim_x/2) + 40;
            this.containerEL.scrollLeft = pos_x - (w/2 - dim_x/2) + 200;

            this.scale(oldScale);
        }
    }


    _resetMaxDisplayedLevel() {
        this.dispLevel = 0;
        return;
    }


    _getMaxDisplayedLevel(node: INode)
    {// Returns the highest displayed level.
     // Use getMaxDisplayedLevel (without _).
        if( (node.getLevel() > tempDispLevel)   &&
            (node.isShow())                     )
        {// Displayed node with higher level
            tempDispLevel = node.getLevel();
        }

        if(!node.isLeaf())
        {// The node has children
            node.children.forEach((n) => {
                this._getMaxDisplayedLevel(n);
            });
        }

        return;
    }


    getMaxDisplayedLevel()
    {// Returns the highest displayed level.
        tempDispLevel = 0;
        this._getMaxDisplayedLevel(this.root);
        this.dispLevel = tempDispLevel;

        return this.dispLevel;
    }


    getMaxNodeDisplayedLevel(node: INode)
    {// Returns the highest displayed level.
        tempDispLevel = 0;
        this._getMaxDisplayedLevel(node);

        return tempDispLevel;
    }


    _setDisplayedLevel(node: INode, level:number)
    {// Display nodes whose level is <= number
        var currentLevel = 0;

        if( (node.getLevel()<level) )
        {// Current level is to be displayed
            node.expand();
            if(!node.isLeaf())
            {// The node has children
                node.children.forEach((n) => {
                    this._setDisplayedLevel(n, level);
                });
            }
        }
        else{
            node.collapse();
        }

        return;
    }


    setDisplayedLevel(level:number)
    {// Display nodes whose level is <= number
        var currentLevel = 0;

        if(level>0) {
            var minLevel = 0;

            this.root.expand();
            this.root.children.forEach((n) => {
                this._setDisplayedLevel(n, level);
            });
        }
        else
        {
            this.root.collapse();
        }

        return;
    }


    setChildrenDisplayedLevel(level:number)
    {// Display children nodes whose level is <= number
        var currentLevel = 0;
        let node = this.selectNode;

        if(level>0 && node) {
            var minLevel = 0;

            if(node.getLevel() == level)
            {// Max required displayed level is node level
                node.mindmap.execute('collapseNode', {
                    node
                });
            }
            else
            {// Expand to required level
                node.expand();
                node.children.forEach((n) => {
                    this._setDisplayedLevel(n, level);
                });
            }
        }
        else
        {
            this.root.collapse();
        }

        this.scale(this.mindScale);

        return;
    }

    _setMindScalePointer(node: INode) {
        this.scalePointer = [];
        // var root = this.root;
        if (node) {
            var rbox = node.getBox();
            this.scalePointer.push(rbox.x + rbox.width / 2, rbox.y + rbox.height / 2);
            if(!node.isSelect){
                this.clearSelectNode();
                node.select();
            }
        }
    }

    getMarkdown() {
        var md = '';
        var level = this.setting.headLevel;
        this.traverseDF((n: INode) => {
            var l = n.getLevel() + 1;
            var hPrefix = '', space = '';
            if (l > 1) {
                hPrefix = '\n';
            }
            const ending = n.isExpand ? '' : ` ^${n.getId()}`
            if (n.getLevel() < level) {
                for (let i = 0; i < l; i++) {
                    hPrefix += '#';
                }
                md += (hPrefix + ' ');
                md += n.getData().text.trim() + ending + '\n';

            } else {
                for (var i = 0; i < n.getLevel() - level; i++) {
                    space += '\t';
                }
                var text = n.getData().text.trim();
                if (text) {
                    var textArr = text.split('\n');
                    var lineLength = textArr.length;

                    if (lineLength == 1) {
                        md += `${space}- ${text}${ending}\n`;
                    } else if (lineLength > 1) {
                        //code
                        if (text.startsWith('```')) {
                            md+='\n'
                            md += `${space}-\n`;
                            textArr.forEach((t: string, i: number) => {
                                md += `${space}  ${t.trim()}${i === textArr.length - 1 ? ending : '' }\n`
                            });
                            md+='\n'
                        } else {
                            //text
                            md += `${space}- `;
                            textArr.forEach((t: string, i: number) => {
                                var contentText = "void";
                                if(t.trim().length > 0){
                                    contentText = t.trim();
                                }
                                if (i > 0) {
                                    md += `${space}${contentText}${i === textArr.length - 1 ? ending : '' }\n`
                                } else {
                                    md += `${contentText}\n`
                                }
                            });
                        }

                    }
                } else {
                    for (var i = 0; i < n.getLevel() - level; i++) {
                        space += '   ';
                    }
                    md += `${space}-\n`;
                }
            }
        }, this.root, true);
        return md.trim();
    }
    scale(num: number) {
        if (num < 20) {
            num = 20;
        }
        if (num > 300) {
            num = 300;
        }
        this.mindScale = num;
        if (this.scalePointer.length) {
            this.appEl.style.transformOrigin = `${this.scalePointer[0]}px ${this.scalePointer[1]}px`;
            this.appEl.style.transform = "scale(" + this.mindScale / 100 + ")";
        } else {
            this.appEl.style.transform = "scale(" + this.mindScale / 100 + ")";
        }
        // Sync zoom panel UI
        this._syncZoomUI();
    }

    setScale(type: string) {
        if (type == "up") {
            var n = this.mindScale + 10;
        } else {
            var n = this.mindScale - 10;
        }
        this.scale(n);
    }

    copyNode(node?:any){
        var n = node||this.selectNode;
        if(n){
           return this.copyNodes([n]);
        }else{
            return ''
        }
  }

  copyNodes(nodes: INode[]) {
        if(!nodes || !nodes.length){
            return '';
        }
        var data:any = [];
        function serializeNode(n:INode, pid:any) {
            var d = n.getData();
            const id = uuid();
            data.push({
                id:id,
                text:d.text,
                pid:pid,
                isExpand:d.isExpand,
                note:d.note
            });
            n.children.forEach((c) => {
                serializeNode(c, id);
            });
        }

        nodes.forEach((n: INode) => {
            serializeNode(n, null);
        });

        var _data = {
            type:'copyNode',
            text:data
        };
        return JSON.stringify(_data);
  }

  pasteNode(text:string){
        var node = this.selectNode || this.root;
        if (!node) return;
        if(text){
            try{
                  var json =JSON.parse(text);
                  if(json.type&&json.type=='copyNode'){
                    var data = json.text;
                    if(!node.isExpand){
                       node.expand();
                       node.clearCacheData();
                    }
                   this.execute('pasteNode',{
                       node:node,
                       data:data
                   })
                  }
            }catch(err){
                console.error('Failed to parse pasted node payload', err);
            }
        }

  }

}
