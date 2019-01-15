import { Api } from 'chessground/api';
import { Key } from 'chessground/types';
import { Color } from '../../../protocol/color';
import { SoundPlayer } from '../sound/soundplayer';

export class ChessBoardWrapper {
  private chessBoard_: Api | null;
  private chessBoardElement_: HTMLElement | null;
  private soundPlayer_: SoundPlayer;

  constructor(soundPlayer: SoundPlayer) {
    this.chessBoard_ = null;
    this.chessBoardElement_ = null;
    this.soundPlayer_ = soundPlayer;
  }

  setChessBoard(chessBoard: Api, chessBoardElement: HTMLElement) {
    this.chessBoard_ = chessBoard;
    this.chessBoardElement_ = chessBoardElement;
  }

  redraw(): void {
    if (!this.chessBoard_ || !this.chessBoardElement_) {
      throw new Error('ChessBoardWrapper not ready.');
    }

    this.removeClassName_('wrongMove');
    this.removeClassName_('rightMove');
    this.removeClassName_('finishLine');
    this.removeHints();
    this.chessBoard_.redrawAll();
  }

  setStateFromChess(chess: any): void {
    if (!this.chessBoard_ || !this.chessBoardElement_) {
      throw new Error('ChessBoardWrapper not ready.');
    }

    const color: 'white' | 'black' = chess.turn() == 'w' ? 'white' : 'black';
    const legalMoves: {[fromSquare: string]: string[]} = {};
    const moves: {from: string, to: string}[] = chess.moves({verbose: true});
    moves.forEach(m => {
      if (!legalMoves[m.from]) {
        legalMoves[m.from] = [];
      }
      legalMoves[m.from].push(m.to);
    });
    const history = chess.history({verbose: true});
    const lastChessMove = history[history.length - 1];
    const lastMove = lastChessMove
        ? [lastChessMove.from, lastChessMove.to]
        : undefined;

    this.chessBoard_.set({
      check: chess.in_check(),
      fen: chess.fen(),
      lastMove: lastMove,
      turnColor: color,
      movable: {
        color: color,
        dests: legalMoves as {[key: string]: Key[]}
      }
    });

    if (lastChessMove && lastChessMove.san.includes('x')) {
      this.soundPlayer_.playCapture();
    } else {
      this.soundPlayer_.playMove();
    }
  }

  setInitialPositionImmediately() {
    if (this.chessBoard_) {
      this.removeHints();
      this.chessBoard_.set({
        check: undefined,
        fen: 'start',
        lastMove: undefined
      });
    }
  }

  setOrientationForColor(color: Color): void {
    if (this.chessBoard_) {
      let newOrientation: ('white' | 'black') = color == Color.WHITE
          ? 'white'
          : 'black';
      if (this.chessBoard_.state.orientation != newOrientation) {
        this.chessBoard_.set({orientation: newOrientation});
      }
    }
  }

  flashRightMove(): void {
    this.removeClassName_('wrongMove');
    this.removeClassName_('finishLine');
    this.flashClassName_('rightMove');
  }

  flashWrongMove(): void {
    this.removeClassName_('rightMove');
    this.removeClassName_('finishLine');
    this.flashClassName_('wrongMove');
    this.soundPlayer_.playWrongMove();
  }

  flashFinishLine(): void {
    this.removeClassName_('wrongMove');
    this.removeClassName_('rightMove');
    this.flashClassName_('finishLine');
    this.soundPlayer_.playFinishLine();
  }

  hintSquare(square: string): void {
    this.hintMove(square /* fromSquare */, null /* toSquare */);
  }

  hintMove(fromSquare: string, toSquare: string | null): void {
    if (this.chessBoard_) {
      this.chessBoard_.setAutoShapes([{
        orig: fromSquare as Key,
        dest: toSquare as Key,
        brush: 'red'
      }]);
    }
  }

  removeHints(): void {
    if (this.chessBoard_) {
      this.chessBoard_.setAutoShapes([]);
    }
  }

  private removeClassName_(className: string): void {
    if (this.chessBoardElement_) {
      this.chessBoardElement_.classList.remove(className);
    }
  }

  private flashClassName_(className: string): void {
    if (this.chessBoardElement_) {
      this.chessBoardElement_.classList.remove(className);
      // This is needed to restart the animation.
      void this.chessBoardElement_.offsetWidth;
      this.chessBoardElement_.classList.add(className);
    }
  }
}
