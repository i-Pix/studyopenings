import { Color } from '../../../protocol/color';
import { assert } from '../../../util/assert';
import { AnnotationRenderer } from '../annotation/annotationrenderer';
import { Annotator } from '../annotation/annotator';
import { Board } from '../board/board';
import { RefreshableView } from '../common/refreshableview';
import { Tooltips } from '../common/tooltips';
import { ViewInfo } from '../common/viewinfo';
import { TreeModel } from './treemodel';
import { TreeNodeHandler } from './treenodehandler';

enum Classes {
  DISABLED = 'disabled',
  HIDDEN = 'hidden',
  SELECTABLE = 'selectable',

  NODE = 'treeViewNode',
  SELECTED_NODE = 'selectedNode',

  ROW = 'treeViewRow',
  SEGMENT = 'treeViewSegment',
  TREE_VIEW_INNER = 'treeViewInner',
  TREE_VIEW_OUTER = 'treeViewOuter'
}

export class TreeView<ANNOTATION> implements RefreshableView {
  private treeViewInnerElement_: HTMLElement;
  private treeViewOuterElement_: HTMLElement;
  private treeModel_: TreeModel;
  private treeNodeHandler_: TreeNodeHandler;
  private board_: Board;
  private annotator_: Annotator<ANNOTATION>;
  private annotationRenderer_: AnnotationRenderer<ANNOTATION>;

  constructor(
      treeViewInnerElement: HTMLElement,
      treeViewOuterElement: HTMLElement,
      treeModel: TreeModel,
      treeNodeHandler: TreeNodeHandler,
      board: Board,
      annotator: Annotator<ANNOTATION>,
      annotationRenderer: AnnotationRenderer<ANNOTATION>) {
    this.treeViewInnerElement_ = treeViewInnerElement;
    this.treeViewOuterElement_ = treeViewOuterElement;
    this.treeModel_ = treeModel;
    this.treeNodeHandler_ = treeNodeHandler;
    this.board_ = board;
    this.annotator_ = annotator;
    this.annotationRenderer_ = annotationRenderer;

    treeViewInnerElement.classList.add(Classes.TREE_VIEW_INNER);
    treeViewOuterElement.classList.add(Classes.TREE_VIEW_OUTER);
  }

  refresh(): void {
    Tooltips.hideAll();

    this.treeViewInnerElement_.innerHTML = '';
    let state = new TraversalState();

    // Show/hide the empty tree element as necessary.
    let isModelEmpty = this.treeModel_.isEmpty();
    this.treeViewOuterElement_.classList.toggle(Classes.HIDDEN, isModelEmpty);

    // Update the tree view.
    let selectedNode = null;
    this.treeModel_.traverseDepthFirst(viewInfo => {
      if (!state.rowEl) {
        // This is the first row.
        const firstRowEl = this.createRowForViewInfo_(viewInfo, state);
        state.rowEl = firstRowEl;
        state.plyToIndent[0] = 0;
      }

      state.plyToIndent.splice(viewInfo.lastMovePly + 1);

      let newRow = false;
      if (state.plyToIndent[viewInfo.lastMovePly]) {
        state.indent = state.plyToIndent[viewInfo.lastMovePly];
        state.rowEl = this.createRowForViewInfo_(viewInfo, state);
        newRow = true;
      }
      let newNode = this.appendNodeEl_(state, viewInfo, newRow);
      if (viewInfo.isSelected) {
        selectedNode = newNode;
      }
      if (viewInfo.numChildren > 1) {
        this.createSegmentForViewInfo_(viewInfo, state);
        state.plyToIndent[viewInfo.lastMovePly + 1] = state.indent + 1;
      }
    }, this.annotator_);

    // Update the chess board.
    const color = this.treeModel_.getRepertoireColor();
    this.board_.setStateFromChess(this.treeModel_.getChessForState());
    this.board_.setOrientationForColor(color);

    // Scroll the tree view so that the selected node is in view.
    if (selectedNode) {
      selectedNode = selectedNode as HTMLElement;
      let scrollTop = this.treeViewOuterElement_.offsetTop
          + this.treeViewOuterElement_.scrollTop;
      let scrollBottom = scrollTop + this.treeViewOuterElement_.offsetHeight;
      if (selectedNode.offsetTop < scrollTop
          || selectedNode.offsetTop > scrollBottom) {
        this.treeViewOuterElement_.scrollTop = selectedNode.offsetTop
            - this.treeViewOuterElement_.offsetTop;
      }
    }
  }

  private createSegmentForViewInfo_(
      viewInfo: ViewInfo<ANNOTATION>, state: TraversalState): void {
    const segmentEl = document.createElement('div');
    segmentEl.classList.add(Classes.SEGMENT);

    state.pgnToSegment.set(viewInfo.pgn, segmentEl);

    const segmentParent = state.rowEl
        ? state.rowEl
        : this.treeViewInnerElement_;
    segmentParent.appendChild(segmentEl);
  }

  private createRowForViewInfo_(
      viewInfo: ViewInfo<ANNOTATION>, state: TraversalState): HTMLElement {
    let rowEl = document.createElement('div');
    rowEl.classList.add(Classes.ROW);

    let rowParent = this.treeViewInnerElement_;
    // This needs to check for null explicitly since parentPgn can be the empty
    // string.
    if (viewInfo.parentPgn != null) {
      const parentSegment = state.pgnToSegment.get(viewInfo.parentPgn);
      if (parentSegment) {
        rowParent = parentSegment;
      }
    }
    rowParent.appendChild(rowEl);
    return rowEl;
  }

  private appendNodeEl_(
      state: TraversalState,
      viewInfo: ViewInfo<ANNOTATION>,
      newRow: boolean): HTMLElement {
    let cell = document.createElement('div');
    let label = '(start)';
    if (viewInfo.lastMoveString) {
      label = viewInfo.lastMoveColor == Color.WHITE
          ? viewInfo.lastMoveVerboseString
          : (newRow
              ? viewInfo.lastMoveVerboseString
              : viewInfo.lastMoveString);
    }
    cell.innerText = label;
    cell.classList.add(Classes.NODE);
    cell.onclick = this.treeNodeHandler_.onClick.bind(
        this.treeNodeHandler_, viewInfo.pgn);
    cell.classList.toggle(Classes.SELECTED_NODE, viewInfo.isSelected);

    if (viewInfo.annotationPromise) {
      viewInfo.annotationPromise.then(annotation => {
        this.annotationRenderer_.renderAnnotation(annotation, cell);
      });
    }

    assert(state.rowEl).appendChild(cell);
    return cell;
  }
}

class TraversalState {
  public indent: number;
  public plyToIndent: number[];
  public pgnToSegment: Map<string, HTMLElement>;
  public rowEl: HTMLElement | null;

  constructor() {
    this.indent = 0;
    this.plyToIndent = [];
    this.pgnToSegment = new Map();
    this.rowEl = null;
  }
}
