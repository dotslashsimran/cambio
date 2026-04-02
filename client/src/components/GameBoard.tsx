import React, { useState, useEffect, useRef, useCallback } from 'react'; // useCallback kept for emitAbility
import { ClientGameState, ClientCard } from '../types';
import { getSocket } from '../socket';
import PlayerArea from './PlayerArea';
import CardComponent from './CardComponent';
import ActionPanel from './ActionPanel';
import AbilityModal from './AbilityModal';
import AbilityDrawer from './AbilityDrawer';
import GameOver from './GameOver';

interface GameBoardProps {
  gameState: ClientGameState;
  myPlayerId: string;
  roomCode: string;
  hostId: string;
  chatMessages: Array<{ playerName: string; message: string; timestamp: number }>;
  darkMode: boolean;
  onToggleDark: () => void;
}

interface SnapAnimation {
  success: boolean;
  snapperId: string;
  snapperCardIndex: number;
  targetPlayerId?: string | null;
  targetCardIndex?: number | null;
}

interface SwapSel {
  playerId: string;
  cardIndex: number;
}

export default function GameBoard({ gameState, myPlayerId, roomCode, hostId, chatMessages, darkMode, onToggleDark }: GameBoardProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [tempRevealedCards, setTempRevealedCards] = useState<Record<number, ClientCard>>({});
  const [peekedIndices, setPeekedIndices] = useState<Set<number>>(new Set());
  const [snapMessage, setSnapMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [snapAnim, setSnapAnim] = useState<SnapAnimation | null>(null);
  const peekTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [snapCountdown, setSnapCountdown] = useState<number | null>(null);

  // ── Ability inline state ──────────────────────────────────────
  const [abilitySwapSel1, setAbilitySwapSel1] = useState<SwapSel | null>(null);
  const [abilitySwapSel2, setAbilitySwapSel2] = useState<SwapSel | null>(null);
  // Temporarily revealed cards during ability peeks (like initial game peek)
  const [abilityOwnReveal, setAbilityOwnReveal] = useState<Record<number, ClientCard>>({});
  const [abilityOppReveal, setAbilityOppReveal] = useState<{ playerId: string; cards: Record<number, ClientCard> } | null>(null);
  const abilityRevealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const socket = getSocket();

  const { phase, players, deckSize, discardPileTop, currentPlayerIndex, drawnCard, abilityState, cambioCalledBy, lastSwap, lastReplace, pendingSnapExchange } = gameState;
  const iGiveCard = pendingSnapExchange?.snapperId === myPlayerId;

  const me = players.find(p => p.id === myPlayerId)!;
  const opponents = players.filter(p => p.id !== myPlayerId);
  const isMyTurn = me?.isCurrentTurn ?? false;
  const canSnap = (phase === 'playing' || phase === 'last_turns') && !!discardPileTop;

  // ── Ability helpers ───────────────────────────────────────────
  const isAbilityMode = phase === 'ability' && !!abilityState?.isMyAbility;
  const abilityStep = abilityState?.step ?? null;
  const abilityRank = abilityState?.abilityCard.rank ?? null;
  const SWAP_STEPS = new Set(['jack_swap_select_opp', 'queen_swap_select', 'king_swap_select']);
  const isSwapStep = isAbilityMode && abilityStep !== null && SWAP_STEPS.has(abilityStep);

  // Reset swap selections when ability step changes
  useEffect(() => {
    setAbilitySwapSel1(null);
    setAbilitySwapSel2(null);
  }, [abilityState?.step]);

  // ── Inline card reveal (like initial peek) ───────────────────
  useEffect(() => {
    abilityRevealTimers.current.forEach(clearTimeout);
    abilityRevealTimers.current = [];

    if (!abilityState?.isMyAbility) {
      setAbilityOwnReveal({});
      setAbilityOppReveal(null);
      return;
    }

    const { step, peekedOwnIndex, peekedOwnCard, peekedOppPlayerId, peekedOppIndex, peekedOppCard } = abilityState;
    const REVEAL_MS = 3000;

    if (step === 'peek_own_reveal') {
      // 7/8: flip own card face-up, auto-advance after timeout
      if (peekedOwnCard !== undefined && peekedOwnIndex !== undefined) {
        setAbilityOwnReveal({ [peekedOwnIndex]: peekedOwnCard });
        const t = setTimeout(() => {
          setAbilityOwnReveal({});
          socket.emit('ability_action', { action: 'close_peek', data: {} });
        }, REVEAL_MS);
        abilityRevealTimers.current.push(t);
      }
    } else if (step === 'peek_opp_reveal') {
      // 9/10 or King: flip opp card (and own for King) face-up, auto-advance
      if (peekedOppPlayerId && peekedOppCard !== undefined && peekedOppIndex !== undefined) {
        setAbilityOppReveal({ playerId: peekedOppPlayerId, cards: { [peekedOppIndex]: peekedOppCard } });
      }
      if (peekedOwnCard !== undefined && peekedOwnIndex !== undefined) {
        setAbilityOwnReveal({ [peekedOwnIndex]: peekedOwnCard });
      }
      const t = setTimeout(() => {
        setAbilityOwnReveal({});
        setAbilityOppReveal(null);
        socket.emit('ability_action', { action: 'close_peek', data: {} });
      }, REVEAL_MS);
      abilityRevealTimers.current.push(t);
    } else if (step === 'jack_swap_decide') {
      // Jack: show own peeked card briefly (client-side only, no server action)
      if (peekedOwnCard !== undefined && peekedOwnIndex !== undefined) {
        setAbilityOwnReveal({ [peekedOwnIndex]: peekedOwnCard });
        const t = setTimeout(() => setAbilityOwnReveal({}), REVEAL_MS);
        abilityRevealTimers.current.push(t);
      }
    } else if (step === 'queen_swap_select') {
      // Queen: show opp peeked card briefly (client-side only, no server action)
      if (peekedOppPlayerId && peekedOppCard !== undefined && peekedOppIndex !== undefined) {
        setAbilityOppReveal({ playerId: peekedOppPlayerId, cards: { [peekedOppIndex]: peekedOppCard } });
        const t = setTimeout(() => setAbilityOppReveal(null), REVEAL_MS);
        abilityRevealTimers.current.push(t);
      }
    } else {
      setAbilityOwnReveal({});
      setAbilityOppReveal(null);
    }

    return () => { abilityRevealTimers.current.forEach(clearTimeout); };
  }, [abilityState?.step, abilityState?.isMyAbility]);

  const emitAbility = useCallback((action: string, data: any = {}) => {
    socket.emit('ability_action', { action, data });
    setAbilitySwapSel1(null);
    setAbilitySwapSel2(null);
  }, [socket]);

  const handleAbilitySwapSelectClean = (playerId: string, cardIndex: number) => {
    if (abilitySwapSel1?.playerId === playerId && abilitySwapSel1?.cardIndex === cardIndex) {
      setAbilitySwapSel1(abilitySwapSel2);
      setAbilitySwapSel2(null);
      return;
    }
    if (abilitySwapSel2?.playerId === playerId && abilitySwapSel2?.cardIndex === cardIndex) {
      setAbilitySwapSel2(null);
      return;
    }
    if (!abilitySwapSel1) { setAbilitySwapSel1({ playerId, cardIndex }); return; }
    if (!abilitySwapSel2) { setAbilitySwapSel2({ playerId, cardIndex }); return; }
    // Both set — replace sel2
    setAbilitySwapSel2({ playerId, cardIndex });
  };

  const myAbilityHighlight = isAbilityMode && (
    abilityStep === 'peek_own_select' || isSwapStep
  );

  const oppAbilityHighlight = (oppId: string) =>
    isAbilityMode &&
    (abilityStep === 'peek_opp_select' || isSwapStep) &&
    oppId !== cambioCalledBy;

  const myAbilitySelectedIndices = [
    ...(abilitySwapSel1?.playerId === myPlayerId ? [abilitySwapSel1.cardIndex] : []),
    ...(abilitySwapSel2?.playerId === myPlayerId ? [abilitySwapSel2.cardIndex] : []),
  ];

  const oppAbilitySelectedIndices = (oppId: string) => [
    ...(abilitySwapSel1?.playerId === oppId ? [abilitySwapSel1.cardIndex] : []),
    ...(abilitySwapSel2?.playerId === oppId ? [abilitySwapSel2.cardIndex] : []),
  ];

  const canConfirmSwap = (): boolean => {
    if (!abilitySwapSel1 || !abilitySwapSel2) return false;
    if (abilityStep === 'jack_swap_select_opp') {
      const oneIsMine = abilitySwapSel1.playerId === myPlayerId || abilitySwapSel2.playerId === myPlayerId;
      const oneIsOpp = abilitySwapSel1.playerId !== myPlayerId || abilitySwapSel2.playerId !== myPlayerId;
      return oneIsMine && oneIsOpp;
    }
    return true;
  };

  const emitAbilitySwap = () => {
    if (!abilitySwapSel1 || !abilitySwapSel2 || !abilityStep) return;
    if (abilityStep === 'jack_swap_select_opp') {
      const myCard = abilitySwapSel1.playerId === myPlayerId ? abilitySwapSel1 : abilitySwapSel2;
      const oppCard = myCard === abilitySwapSel1 ? abilitySwapSel2 : abilitySwapSel1;
      emitAbility('do_swap', { myCardIndex: myCard.cardIndex, targetPlayerId: oppCard.playerId, targetCardIndex: oppCard.cardIndex });
    } else {
      emitAbility('do_swap', {
        p1Id: abilitySwapSel1.playerId, p1CardIndex: abilitySwapSel1.cardIndex,
        p2Id: abilitySwapSel2.playerId, p2CardIndex: abilitySwapSel2.cardIndex,
      });
    }
  };

  const handleAbilityOppCardClick = (playerId: string, cardIndex: number) => {
    if (!isAbilityMode) return;
    if (abilityStep === 'peek_opp_select') {
      emitAbility('peek_opp', { targetPlayerId: playerId, cardIndex });
      return;
    }
    if (isSwapStep) {
      handleAbilitySwapSelectClean(playerId, cardIndex);
    }
  };

  // ── Phase / turn resets ───────────────────────────────────────
  useEffect(() => {
    if (gameState.phase !== 'peek') {
      setPeekedIndices(new Set());
      setTempRevealedCards({});
    }
  }, [gameState.phase]);

  useEffect(() => {
    const endsAt = gameState.snapWindowEndsAt;
    if (!endsAt) { setSnapCountdown(null); return; }
    const tick = () => {
      const remaining = Math.ceil((endsAt - Date.now()) / 1000);
      setSnapCountdown(remaining > 0 ? remaining : 0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [gameState.snapWindowEndsAt]);

  useEffect(() => {
    const handlePeekReveal = ({ cardIndex, card, duration }: { cardIndex: number; card: ClientCard; duration: number }) => {
      setPeekedIndices(prev => new Set([...prev, cardIndex]));
      setTempRevealedCards(prev => ({ ...prev, [cardIndex]: card }));
      if (peekTimers.current[cardIndex]) clearTimeout(peekTimers.current[cardIndex]);
      peekTimers.current[cardIndex] = setTimeout(() => {
        setTempRevealedCards(prev => {
          const next = { ...prev };
          delete next[cardIndex];
          return next;
        });
        delete peekTimers.current[cardIndex];
      }, duration);
    };

    const handleSnapResult = ({ success, message }: { success: boolean; message: string }) => {
      setSnapMessage({ text: message, success });
      setTimeout(() => setSnapMessage(null), 2500);
    };

    const handleSnapAnimation = (data: SnapAnimation) => {
      setSnapAnim(data);
      setTimeout(() => setSnapAnim(null), 900);
    };

    socket.on('peek_reveal', handlePeekReveal);
    socket.on('snap_result', handleSnapResult);
    socket.on('snap_animation', handleSnapAnimation);
    return () => {
      socket.off('peek_reveal', handlePeekReveal);
      socket.off('snap_result', handleSnapResult);
      socket.off('snap_animation', handleSnapAnimation);
    };
  }, [socket]);

  useEffect(() => {
    setSelectedCardIndex(null);
  }, [currentPlayerIndex, phase]);

  // Double-click my own card → snap attempt
  const handleMyCardDoubleClick = (index: number) => {
    if (!canSnap) return;
    if (myPlayerId === cambioCalledBy) return;
    socket.emit('snap', { targetPlayerId: null, targetCardIndex: null, myCardIndex: index });
  };

  const handleMyCardClick = (index: number) => {
    // Ability: peek own select
    if (isAbilityMode && abilityStep === 'peek_own_select') {
      emitAbility('peek_own', { cardIndex: index });
      return;
    }
    // Ability: swap select
    if (isAbilityMode && isSwapStep) {
      handleAbilitySwapSelectClean(myPlayerId, index);
      return;
    }

    // Completing opponent snap — pick card to give away
    if (iGiveCard) {
      socket.emit('snap_give_card', { myCardIndex: index });
      return;
    }

    if (phase === 'peek') {
      if (!peekedIndices.has(index) && peekedIndices.size < 2) {
        socket.emit('peek_card', { cardIndex: index });
      }
      return;
    }

    if (!isMyTurn) return;
    if (phase === 'playing' || phase === 'last_turns') {
      if (drawnCard !== null) {
        setSelectedCardIndex(prev => prev === index ? null : index);
      }
    }
  };

  const handleOpponentCardDoubleClick = (playerId: string, _playerName: string, cardIndex: number) => {
    if (!canSnap) return;
    if (playerId === cambioCalledBy) return;
    socket.emit('snap', { targetPlayerId: playerId, targetCardIndex: cardIndex, myCardIndex: null });
  };

  const handleDrawDeck = () => socket.emit('draw_card', { source: 'deck' });
  const handleDrawDiscard = () => socket.emit('draw_card', { source: 'discard' });

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('chat_message', { message: chatInput.trim() });
    setChatInput('');
  };

  const myPeekedCount = peekedIndices.size;

  const phaseLabel: Record<string, string> = {
    waiting: 'Waiting', peek: 'Peek Phase', playing: 'Playing',
    ability: 'Ability', last_turns: 'Final Turns', game_over: 'Game Over',
  };

  // Swap hint text
  const swapHintText = () => {
    if (!isSwapStep) return '';
    if (abilityStep === 'jack_swap_select_opp') {
      if (!abilitySwapSel1) return "Click any of your cards or an opponent's card";
      const sel1IsMine = abilitySwapSel1.playerId === myPlayerId;
      if (!abilitySwapSel2) return sel1IsMine ? "Now click an opponent's card" : "Now click one of your cards";
      return 'Ready!';
    }
    if (!abilitySwapSel1) return 'Click any two cards to swap';
    if (!abilitySwapSel2) return 'Click the 2nd card';
    return 'Ready!';
  };

  const hasValidOppForJack = opponents.some(p => p.id !== cambioCalledBy);

  return (
    <div className="game-board">
      {/* Header */}
      <div className="game-header">
        <div className="title">CAMBIO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {cambioCalledBy && (
            <div className="status-badge status-cambio">
              CAMBIO CALLED • {gameState.lastTurnsLeft} turns left
            </div>
          )}
          <div className={`phase-badge phase-${phase}`}>{phaseLabel[phase] ?? phase}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Room: {roomCode}</div>
          <button className="dark-toggle" onClick={onToggleDark}>{darkMode ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}</button>
        </div>
      </div>

      {/* Snap result toast */}
      {snapMessage && (
        <div className={`snap-toast ${snapMessage.success ? 'snap-toast-success' : 'snap-toast-fail'}`}>
          {snapMessage.text}
        </div>
      )}

      {/* Snap window countdown banner */}
      {snapCountdown !== null && (
        <div className="snap-window-banner">
          <span className="snap-window-icon">⚡</span>
          <span>Game ending — snap now if you can!</span>
          <span className="snap-window-countdown">{snapCountdown}s</span>
        </div>
      )}

      {/* Pending snap exchange — snapper must give a card */}
      {iGiveCard && (
        <div className="snap-pick-prompt">
          <span>Snap! Now click one of your cards to give away:</span>
        </div>
      )}

      {phase === 'ability' && abilityState && !abilityState.isMyAbility && (
        <AbilityDrawer gameState={gameState} />
      )}

      {/* Opponents */}
      <div className="opponents-area">
        {opponents.map(opp => {
          const oppSwapping = lastSwap
            ? (lastSwap.p1Id === opp.id ? [lastSwap.p1CardIndex] : lastSwap.p2Id === opp.id ? [lastSwap.p2CardIndex] : [])
            : [];
          const oppPeekHighlight = abilityState && !abilityState.isMyAbility
            ? (abilityState.peekedOppPlayerId === opp.id ? (abilityState.peekedOppIndex ?? null) : null)
            : null;
          let abilityBadge: string | undefined;
          if (phase === 'ability' && abilityState && opp.isCurrentTurn) {
            const s = abilityState.step;
            if (s === 'peek_own_select') abilityBadge = 'Choosing a card to peek';
            else if (s === 'peek_own_reveal') abilityBadge = 'Peeking their own card';
            else if (s === 'peek_opp_select') abilityBadge = 'Choosing your card to peek';
            else if (s === 'peek_opp_reveal') abilityBadge = 'Peeking a card';
            else if (s === 'jack_swap_decide') abilityBadge = 'Deciding whether to swap';
            else if (s === 'jack_swap_select_opp') abilityBadge = 'Choosing cards to swap';
            else if (s === 'queen_swap_select') abilityBadge = 'Choosing two cards to swap';
            else if (s === 'king_swap_select') abilityBadge = 'Choosing cards to swap';
          }

          const oppSnapIdx = snapAnim?.snapperId === opp.id
            ? snapAnim.snapperCardIndex
            : snapAnim?.targetPlayerId === opp.id
              ? (snapAnim.targetCardIndex ?? null)
              : null;
          const oppReplaced = lastReplace?.playerId === opp.id ? lastReplace.cardIndex : null;
          const isOppAbilityTarget = oppAbilityHighlight(opp.id);
          return (
            <PlayerArea
              key={opp.id}
              player={opp}
              isMe={false}
              size="sm"
              onCardClick={isOppAbilityTarget ? (idx) => handleAbilityOppCardClick(opp.id, idx) : undefined}
              onCardDoubleClick={canSnap && opp.id !== cambioCalledBy ? (idx) => handleOpponentCardDoubleClick(opp.id, opp.name, idx) : undefined}
              swappingCardIndices={oppSwapping}
              peekHighlightIndex={oppPeekHighlight}
              snapHighlightIndex={oppSnapIdx}
              snapHighlightSuccess={snapAnim?.success ?? true}
              replacedCardIndex={oppReplaced}
              isFrozen={opp.id === cambioCalledBy}
              abilityBadge={abilityBadge}
              abilityHighlight={isOppAbilityTarget}
              abilitySelectedIndices={oppAbilitySelectedIndices(opp.id)}
              abilityRevealedCards={abilityOppReveal?.playerId === opp.id ? abilityOppReveal.cards : undefined}
            />
          );
        })}
      </div>

      {/* Center: piles */}
      <div className="center-area">
        <div className="pile-area">
          <div className="pile-container">
            <div className="pile-label">Deck</div>
            <CardComponent
              faceDown={true}
              size="lg"
              onClick={isMyTurn && !drawnCard && (phase === 'playing' || phase === 'last_turns') ? handleDrawDeck : undefined}
              disabled={!isMyTurn || !!drawnCard || (phase !== 'playing' && phase !== 'last_turns')}
            />
            <div className="pile-count">{deckSize} cards</div>
          </div>

          <div className="pile-container">
            <div className="pile-label">Discard</div>
            {discardPileTop ? (
              <CardComponent
                card={discardPileTop}
                size="lg"
                onClick={isMyTurn && !drawnCard && (phase === 'playing' || phase === 'last_turns') ? handleDrawDiscard : undefined}
                disabled={!isMyTurn || !!drawnCard || (phase !== 'playing' && phase !== 'last_turns')}
              />
            ) : (
              <div className="card card-lg card-empty" />
            )}
          </div>

          {drawnCard && (
            <div className="pile-container">
              <div className="pile-label">In Hand</div>
              <CardComponent card={drawnCard} size="lg" />
            </div>
          )}
        </div>
      </div>

      {/* My area */}
      <div className="my-area">
        {/* Ability inline hint bar */}
        {isAbilityMode && (
          <div className="ability-hint-bar">
            {(abilityStep === 'peek_own_reveal' || abilityStep === 'peek_opp_reveal') && (
              <span style={{ color: 'var(--lav-dark)', fontWeight: 700 }}>👀 Look at the board — card revealed!</span>
            )}
            {abilityStep === 'peek_own_select' && (
              <span>Click one of your cards to peek it</span>
            )}
            {abilityStep === 'peek_opp_select' && (
              <span>Click an opponent's card to peek it</span>
            )}
            {abilityStep === 'jack_swap_decide' && abilityState && (
              <>
                <span>Want to swap one of your cards with an opponent's?</span>
                {hasValidOppForJack && (
                  <button className="btn btn-primary btn-sm" onClick={() => emitAbility('swap')}>Swap</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => emitAbility('skip')}>
                  {hasValidOppForJack ? 'Skip' : 'OK'}
                </button>
              </>
            )}
            {isSwapStep && (
              <>
                <span>{swapHintText()}</span>
                {canConfirmSwap() && (
                  <button className="btn btn-primary btn-sm" onClick={emitAbilitySwap}>Swap!</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => emitAbility('skip')}>Skip</button>
              </>
            )}
          </div>
        )}

        {phase === 'peek' && !isAbilityMode && (
          <div className="peek-instruction">
            Click 2 cards to peek ({myPeekedCount}/2)
            {myPeekedCount >= 2 && (
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 12 }} onClick={() => socket.emit('peek_done')}>
                Done Peeking
              </button>
            )}
          </div>
        )}
        {canSnap && !iGiveCard && !isAbilityMode && (
          <div className="snap-hint">Double-click any card to snap it against the discard</div>
        )}
        {iGiveCard && (
          <div className="snap-hint snap-hint-active">↓ Click one of your cards to give away</div>
        )}

        <PlayerArea
          player={me}
          isMe={true}
          size="lg"
          selectedCardIndex={drawnCard ? selectedCardIndex : null}
          highlightCards={iGiveCard}
          onCardClick={handleMyCardClick}
          onCardDoubleClick={canSnap && !iGiveCard ? handleMyCardDoubleClick : undefined}
          tempRevealedCards={{ ...tempRevealedCards, ...abilityOwnReveal }}
          swappingCardIndices={lastSwap
            ? (lastSwap.p1Id === myPlayerId ? [lastSwap.p1CardIndex] : lastSwap.p2Id === myPlayerId ? [lastSwap.p2CardIndex] : [])
            : []}
          peekHighlightIndex={abilityState && !abilityState.isMyAbility
            ? (abilityState.peekedOppPlayerId === myPlayerId ? (abilityState.peekedOppIndex ?? null) : null)
            : null}
          snapHighlightIndex={snapAnim?.snapperId === myPlayerId
            ? snapAnim.snapperCardIndex
            : snapAnim?.targetPlayerId === myPlayerId
              ? (snapAnim.targetCardIndex ?? null)
              : null}
          snapHighlightSuccess={snapAnim?.success ?? true}
          replacedCardIndex={lastReplace?.playerId === myPlayerId ? lastReplace.cardIndex : null}
          isFrozen={myPlayerId === cambioCalledBy}
          abilityHighlight={myAbilityHighlight}
          abilitySelectedIndices={myAbilitySelectedIndices}
        />

        <div className="action-panel-area">
          <ActionPanel gameState={gameState} selectedCardIndex={selectedCardIndex} onSelectCard={setSelectedCardIndex} />
        </div>
      </div>

      {/* AbilityModal handled entirely inline */}
      <AbilityModal />
      {phase === 'game_over' && <GameOver gameState={gameState} myPlayerId={myPlayerId} hostId={hostId} />}

      {/* Chat sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-title">Chat</div>
        <div className="chat-sidebar-messages">
          {chatMessages.map((msg, i) => (
            <div key={i} className="chat-message" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
              <span className="chat-name" style={{ fontSize: '0.75rem' }}>{msg.playerName}: </span>
              {msg.message}
            </div>
          ))}
        </div>
        <form className="chat-sidebar-input" onSubmit={handleChat}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Chat..." maxLength={200} />
          <button type="submit" className="btn btn-secondary btn-sm">Go</button>
        </form>
      </div>
    </div>
  );
}
