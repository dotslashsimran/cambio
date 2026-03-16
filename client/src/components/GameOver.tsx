import React from 'react';
import { ClientGameState, ClientPlayer, ClientCard } from '../types';
import CardComponent from './CardComponent';

interface GameOverProps {
  gameState: ClientGameState;
  myPlayerId: string;
}

interface PlayerScore {
  player: ClientPlayer;
  total: number;
  isMe: boolean;
  isWinner: boolean;
}

export default function GameOver({ gameState, myPlayerId }: GameOverProps) {
  const { players } = gameState;

  // Calculate scores (all cards should be revealed now)
  const scores: PlayerScore[] = players.map(player => {
    const total = player.cards.reduce((sum, card) => sum + (card?.value ?? 0), 0);
    return {
      player,
      total,
      isMe: player.id === myPlayerId,
      isWinner: false,
    };
  });

  const minScore = Math.min(...scores.map(s => s.total));
  scores.forEach(s => { s.isWinner = s.total === minScore; });

  // Sort by score
  const sorted = [...scores].sort((a, b) => a.total - b.total);
  const winner = sorted[0];

  const handlePlayAgain = () => {
    window.location.reload();
  };

  return (
    <div className="game-over-backdrop">
      <div className="game-over-panel">
        <div className="game-over-title">GAME OVER</div>

        <div className="winner-announcement">
          <div className="winner-label">Winner</div>
          <div className="winner-name">{winner?.player.name ?? 'Unknown'}</div>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
            with {winner?.total ?? 0} points
          </div>
        </div>

        <table className="scores-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Cards</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, idx) => (
              <tr key={s.player.id} className={s.isWinner ? 'winner-row' : ''}>
                <td>{idx + 1}{s.isWinner ? ' 🏆' : ''}</td>
                <td>
                  {s.player.name}
                  {s.isMe ? ' (You)' : ''}
                </td>
                <td>
                  <div className="player-cards-reveal">
                    {s.player.cards.map((card, i) => (
                      <CardComponent
                        key={i}
                        card={card}
                        faceDown={!card}
                        size="sm"
                        disabled
                      />
                    ))}
                  </div>
                </td>
                <td style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="game-over-actions">
          <button className="btn btn-primary btn-lg" onClick={handlePlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
