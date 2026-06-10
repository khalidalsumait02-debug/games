import { useReducer, useRef, useState } from 'react';
import type { GameState, MeetingPick } from './engine/types';
import { loadSave, newGame, reduce, save, scenarioFor, type Action } from './engine/game';
import { LEVEL_INFO, config } from './engine/content';
import Menu from './screens/Menu';
import Meeting from './screens/Meeting';
import Process from './screens/Process';
import MonthEnd from './screens/MonthEnd';
import Results from './screens/Results';
import Leaderboard from './screens/Leaderboard';
import Glossary from './screens/Glossary';

type View = 'menu' | 'game' | 'leaderboard' | 'glossary';

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
  const returnView = useRef<View>('menu');

  const startGame = (name: string, level: 1 | 2 | 3) => {
    const g = newGame(name, level);
    save(g);
    dispatch({ type: 'LOAD', state: g });
    setView('game');
  };

  const resumeGame = () => {
    if (!savedGame) return;
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={toMenu} role="button" tabIndex={0}>
          <span className="bank-mark small">{config.bankShort}</span>
          <span className="brand-name">{config.bankName}</span>
        </div>
        {game && view === 'game' && !game.finished && (
          <div className="hud">
            <span className="hud-item">{LEVEL_INFO[game.level].title.split('—')[0].trim()}</span>
            <span className="hud-item">
              Month {game.month}/{config.campaignMonths}
            </span>
            <span className="hud-item score">⭐ {game.score.toLocaleString()}</span>
            <span className="hud-item" title="Reputation — at zero, the board ends your campaign">
              <span className="rep-bar">
                <span className="rep-fill" style={{ width: `${game.reputation}%` }} />
              </span>
              {game.reputation}
            </span>
            <button className="btn tiny" onClick={() => openOverlay('glossary')}>
              Guide
            </button>
            <button
              className="btn tiny"
              onClick={toMenu}
              title="Progress is saved automatically — resume from the menu"
            >
              Pause & exit
            </button>
          </div>
        )}
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

        {view === 'game' && game && (
          <>
            {game.phase === 'meeting' && scenario && (
              <Meeting
                key={scenario.id}
                scenario={scenario}
                level={game.level}
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
              <MonthEnd state={game} onContinue={() => dispatch({ type: 'MONTH_CONTINUE' })} />
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
