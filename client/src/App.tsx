import { useReducer, useRef, useState } from 'react';
import type { GameState, MeetingPick } from './engine/types';
import { loadSave, newGame, reduce, save, scenarioFor, type Action } from './engine/game';
import { LEVEL_INFO, config } from './engine/content';
import { isMuted, sfx, toggleMute } from './engine/sfx';
import CountUp from './components/CountUp';
import MonthSplash from './components/MonthSplash';
import Menu from './screens/Menu';
import Meeting from './screens/Meeting';
import Process from './screens/Process';
import MonthEnd from './screens/MonthEnd';
import Results from './screens/Results';
import Leaderboard from './screens/Leaderboard';
import Glossary from './screens/Glossary';
import Journal from './screens/Journal';

type View = 'menu' | 'game' | 'leaderboard' | 'glossary' | 'journal';

function gameReducer(
  state: GameState | null,
  action: Action | { type: 'LOAD'; state: GameState | null }
): GameState | null {
  if (action.type === 'LOAD') return action.state;
  if (!state) return state;
  return reduce(state, action);
}

export default function App() {
  const [view, setView] = useState<View>('menu');
  const [game, dispatch] = useReducer(gameReducer, null);
  const [savedGame, setSavedGame] = useState<GameState | null>(() => loadSave());
  const [splashedMonth, setSplashedMonth] = useState(0);
  const [muted, setMuted] = useState(isMuted());
  const returnView = useRef<View>('menu');

  const startGame = (name: string, level: 1 | 2 | 3) => {
    const g = newGame(name, level);
    save(g);
    setSplashedMonth(0);
    dispatch({ type: 'LOAD', state: g });
    setView('game');
  };

  const resumeGame = () => {
    if (!savedGame) return;
    setSplashedMonth(savedGame.month); // don't replay the splash on resume
    dispatch({ type: 'LOAD', state: savedGame });
    setView('game');
  };

  const toMenu = () => {
    dispatch({ type: 'LOAD', state: null });
    setSavedGame(loadSave());
    setView('menu');
  };

  const openOverlay = (v: View) => {
    returnView.current = view;
    setView(v);
  };

  const closeOverlay = () => {
    if (returnView.current === 'menu') setSavedGame(loadSave());
    setView(returnView.current);
  };

  const scenario = game ? scenarioFor(game) : null;
  const showSplash = view === 'game' && game && game.phase === 'meeting' && game.month !== splashedMonth;

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden />
      <header className="topbar">
        <div className="brand" onClick={toMenu} role="button" tabIndex={0}>
          <span className="bank-mark small">{config.bankShort}</span>
          <span className="brand-name">{config.bankName}</span>
        </div>
        {game && view === 'game' && !game.finished && (
          <div className="hud">
            <span className="hud-stat">
              <span className="hud-label">Level</span>
              <span className="hud-value">
                {game.level} · {LEVEL_INFO[game.level].name}
              </span>
            </span>
            <span className="hud-stat">
              <span className="hud-label">Month</span>
              <span className="hud-value">
                {game.month} of {config.campaignMonths}
              </span>
            </span>
            <span className="hud-stat">
              <span className="hud-label">Score</span>
              <span className="hud-value">
                <CountUp value={game.score} />
              </span>
            </span>
            <span className="hud-stat">
              <span className="hud-label">Streak</span>
              <span className="hud-value">{game.streak > 0 ? `+${game.streak}` : '—'}</span>
            </span>
            <span className="hud-stat rep" title="Reputation — at zero, the board ends your campaign">
              <span className="hud-label">Reputation · {game.reputation}/100</span>
              <span className="rep-bar">
                <span
                  className={`rep-fill ${game.reputation < 30 ? 'danger' : ''}`}
                  style={{ width: `${game.reputation}%` }}
                />
              </span>
            </span>
            <button className="btn tiny" onClick={() => openOverlay('journal')} title="Lessons collected so far">
              Journal
            </button>
            <button className="btn tiny" onClick={() => openOverlay('glossary')} title="Product & SOP guide">
              Reference guide
            </button>
            <button
              className="btn tiny"
              onClick={toMenu}
              title="Progress is saved automatically — resume from the menu"
            >
              Pause
            </button>
          </div>
        )}
        <button
          className="btn tiny mute"
          onClick={() => setMuted(toggleMute())}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <main>
        {view === 'menu' && (
          <Menu
            savedGame={savedGame}
            onStart={startGame}
            onResume={resumeGame}
            onLeaderboard={() => openOverlay('leaderboard')}
            onGlossary={() => openOverlay('glossary')}
          />
        )}

        {view === 'leaderboard' && <Leaderboard onBack={closeOverlay} />}
        {view === 'glossary' && <Glossary onBack={closeOverlay} />}
        {view === 'journal' && game && <Journal state={game} onBack={closeOverlay} />}

        {view === 'game' && game && (
          <>
            {showSplash && <MonthSplash month={game.month} onDone={() => setSplashedMonth(game.month)} />}
            {game.phase === 'meeting' && scenario && !showSplash && (
              <Meeting
                key={scenario.id}
                scenario={scenario}
                level={game.level}
                month={game.month}
                isFirstMeeting={game.scenarioIndex === 0}
                onDone={(picks: MeetingPick[]) =>
                  dispatch({ type: 'MEETING_DONE', result: { scenarioId: scenario.id, picks } })
                }
              />
            )}
            {game.phase === 'process' && scenario && (
              <Process
                key={scenario.id}
                scenario={scenario}
                onDone={(orderScore, docScore, plantedScore) =>
                  dispatch({
                    type: 'PROCESS_DONE',
                    result: { scenarioId: scenario.id, orderScore, docScore, plantedScore },
                  })
                }
              />
            )}
            {game.phase === 'monthEnd' && (
              <MonthEnd
                key={`m${game.month}`}
                state={game}
                onContinue={() => {
                  sfx.click();
                  dispatch({ type: 'MONTH_CONTINUE' });
                }}
              />
            )}
            {game.phase === 'results' && (
              <Results state={game} onMenu={toMenu} onLeaderboard={() => openOverlay('leaderboard')} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
