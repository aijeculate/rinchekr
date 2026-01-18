import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Settings as SettingsIcon, CheckCircle, Activity, Zap, AlertCircle, Play, Gamepad2 } from 'lucide-react'
import './App.css'
import { ViewToggle } from './components/ViewToggle'
import { Settings } from './components/Settings'
import { GameDetails } from './components/GameDetails'
import { Game } from './types'
import { useToast } from './context/ToastContext'

import { TutorialModal } from './components/TutorialModal'

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  // New State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [darkMode, setDarkMode] = useState(true)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  const [newGameName, setNewGameName] = useState('')
  const [newGameUrl, setNewGameUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { addToast } = useToast();

  useEffect(() => {
    loadGames()

    // Check Tutorial Status
    window.api.getTutorialStatus().then(seen => {
      if (!seen) setIsTutorialOpen(true);
    });

    // Apply Theme
    document.documentElement.style.setProperty('--app-scale', scale.toString())
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')

    const cleanup = window.api.onUpdateStatus((data) => {
      setGames(prev => prev.map(g => {
        if (g.id === data.id) {
          if (data.status === 'update-available') {
            addToast(`Update found for ${g.name}!`, 'info');
          }
          const updated = { ...g, ...data, lastChecked: new Date().toISOString() };
          setSelectedGame(prevSelected => prevSelected?.id === data.id ? updated : prevSelected);
          return updated;
        }
        return g
      }))
    })
    return cleanup
  }, [scale, darkMode])

  const loadGames = async () => {
    const loaded = await window.api.getGames()
    setGames(loaded)
  }

  const handleAddGame = async () => {
    setErrorMsg('')
    if (!newGameName && !newGameUrl) return;

    addToast('Fetching metadata and adding game...', 'info');

    try {
      const game = await window.api.addGame({ name: newGameName, url: newGameUrl })
      setGames(prev => [...prev, game])
      setIsAddModalOpen(false)
      setNewGameName('')
      setNewGameUrl('')
      addToast(`Added ${game.name} successfully`, 'success');
    } catch (e: any) {
      setErrorMsg('Failed to add game. Ensure URL is valid.')
      addToast('Failed to add game', 'error');
    }
  }

  const handleRemove = async (id: string) => {
    await window.api.removeGame(id)
    setGames(prev => prev.filter(g => g.id !== id))
    if (selectedGame?.id === id) setSelectedGame(null)
    addToast('Game removed', 'info');
  }

  const handleUpdateGame = async (updatedGame: Game) => {
    await window.api.updateGame(updatedGame);
    setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));
    if (selectedGame?.id === updatedGame.id) setSelectedGame(updatedGame);
    addToast('Game details updated', 'success');
  }

  const handleLaunch = async (path: string) => {
    if (!path) {
      addToast('No executable path set!', 'error');
      return;
    }
    addToast('Launching game...', 'info');
    const success = await window.api.launchGame(path);
    if (!success) {
      addToast('Failed to launch game. Check path.', 'error');
    }
  }

  const handleCheckAll = async () => {
    addToast('Checking all games for updates...', 'info');
    await window.api.checkAllUpdates();
    addToast('Check complete', 'success');
  }

  const handleCheckSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent card click
    addToast('Checking for updates...', 'info');
    // Set status to checking locally first
    setGames(prev => prev.map(g => g.id === id ? { ...g, status: 'checking' } : g));
    if (selectedGame?.id === id) setSelectedGame({ ...selectedGame, status: 'checking' });

    try {
      const result = await window.api.checkGame(id);
      setGames(prev => prev.map(g => g.id === id ? { ...g, ...result } : g));
      if (selectedGame?.id === id) setSelectedGame(prev => prev ? ({ ...prev, ...result }) : null);
      addToast('Update check complete', 'success');
    } catch (e) {
      setGames(prev => prev.map(g => g.id === id ? { ...g, status: 'error' } : g));
      if (selectedGame?.id === id) setSelectedGame(prev => prev ? ({ ...prev, status: 'error' }) : null);
      addToast('Failed to check for updates', 'error');
    }
  }

  const getStatusTooltip = (status: string) => {
    switch (status) {
      case 'up-to-date': return 'Game is up to date';
      case 'update-available': return 'New update detected!';
      case 'new-activity': return 'Recent forum activity detected';
      case 'checking': return 'Checking for updates...';
      default: return status;
    }
  }

  return (
    <div className={`container ${viewMode}`}>
      <header className="header">
        <div className="logo">
          <h1>RinChekr</h1>
        </div>
        <div className="actions">
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          <button onClick={() => setIsSettingsOpen(true)} className="btn-icon">
            <SettingsIcon size={20} />
          </button>
          <button onClick={handleCheckAll} className="btn-secondary" title="Check All For Updates">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
            <Plus size={18} />
            <span>Add Game</span>
          </button>
        </div>
      </header>

      <main className={`game-list ${viewMode}`}>
        {games.map(game => {
          return (
            <div
              key={game.id}
              className={`game-card ${viewMode}`}
              onClick={() => setSelectedGame(game)}
            >
              {/* Cover or Icon */}
              {game.imageUrl && viewMode === 'grid' ? (
                <div className="card-cover" style={{ backgroundImage: `url(${game.imageUrl})` }}>
                  <div
                    className={`status-badge floating ${game.status}`}
                    title={getStatusTooltip(game.status)}
                  >
                    {game.status === 'checking' && <RefreshCw className="spin" size={14} />}
                    {game.status === 'up-to-date' && <CheckCircle size={14} />}
                    {game.status === 'update-available' && <Zap size={14} />}
                    {game.status === 'new-activity' && <Activity size={14} />}
                    {game.status === 'error' && <AlertCircle size={14} />}
                  </div>
                </div>
              ) : (
                <div className="game-icon-area" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)',
                  width: viewMode === 'list' ? '60px' : '100%', height: viewMode === 'list' ? '100%' : '140px'
                }}>
                  {game.imageUrl && viewMode === 'list' ? (
                    <div style={{ width: '100%', height: '100%', backgroundImage: `url(${game.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  ) : (
                    <Gamepad2 size={viewMode === 'list' ? 24 : 48} />
                  )}
                </div>
              )}

              <div className="game-info">
                <h3 className="game-title">{game.name}</h3>

                {viewMode === 'list' && (
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span title="Last Game Update">📅 {game.lastUpdated ? new Date(game.lastUpdated).toLocaleDateString() : '-'}</span>
                    <span title="Last Checked Time">🕒 {game.lastChecked ? new Date(game.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  </div>
                )}

                {!game.imageUrl && <p className="game-status-text">{game.status.replace('-', ' ')}</p>}

                {viewMode === 'grid' && (
                  <>
                    <div className="meta-info" style={{
                      fontSize: '0.75em',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '8px',
                      background: 'var(--bg-app)',
                      padding: '8px',
                      borderRadius: '6px',
                      width: '100%'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Updated:</span>
                        <span style={{ fontWeight: 600 }}>{game.lastUpdated ? new Date(game.lastUpdated).toLocaleDateString() : '-'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Checked:</span>
                        <span>{game.lastChecked ? new Date(game.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                    </div>
                    <div className="card-actions" style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        className="btn-icon"
                        style={{ padding: '6px' }}
                        onClick={(e) => { e.stopPropagation(); handleLaunch(game.executablePath || ''); }}
                        title="Launch Game"
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ padding: '6px' }}
                        onClick={(e) => handleCheckSingle(e, game.id)}
                        title="Check for Updates"
                      >
                        <RefreshCw size={16} className={game.status === 'checking' ? 'spin' : ''} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {viewMode === 'list' && (
                <div className="list-extras" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', paddingRight: '16px' }}>

                  {/* Status Badge */}
                  <div className={`status-badge ${game.status}`} style={{ position: 'static' }} title={getStatusTooltip(game.status)}>
                    {game.status === 'checking' && <RefreshCw className="spin" size={14} />}
                    {game.status === 'up-to-date' && <CheckCircle size={14} />}
                    {game.status === 'update-available' && <Zap size={14} />}
                    {game.status === 'new-activity' && <Activity size={14} />}
                    {game.status === 'error' && <AlertCircle size={14} />}
                    <span style={{ marginLeft: '6px', fontSize: '11px' }}>{game.status.replace('-', ' ')}</span>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>

                  {/* Quick Actions */}
                  <button
                    className="btn-icon"
                    onClick={(e) => { e.stopPropagation(); handleLaunch(game.executablePath || ''); }}
                    title="Launch Game"
                  >
                    <Play size={18} fill="currentColor" />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={(e) => handleCheckSingle(e, game.id)}
                    title="Check for Updates"
                  >
                    <RefreshCw size={18} className={game.status === 'checking' ? 'spin' : ''} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {games.length === 0 && (
          <div className="empty-state">
            <p>No games yet.</p>
            <p>Click "Add Game" to start tracking.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        scale={scale}
        setScale={setScale}
        darkMode={darkMode}
        toggleTheme={() => setDarkMode(!darkMode)}
        onShowTutorial={() => setIsTutorialOpen(true)}
      />

      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          window.api.setTutorialStatus(true);
        }}
      />

      {
        isAddModalOpen && (
          <div className="modal-overlay">
            <div className="modal glass">
              <div className="modal-header">
                <h2>Add Game</h2>
              </div>

              {errorMsg && <div className="error-banner">{errorMsg}</div>}
              <div className="form-group">
                <label>Name (Optional - Auto-fetched via Steam)</label>
                <input value={newGameName} onChange={e => setNewGameName(e.target.value)} placeholder="e.g. Cyberpunk 2077" />
              </div>
              <div className="form-group">
                <label>CS.RIN.RU Topic URL</label>
                <input value={newGameUrl} onChange={e => setNewGameUrl(e.target.value)} placeholder="https://cs.rin.ru/forum/..." />
              </div>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setIsAddModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleAddGame} className="btn-primary">Add Game</button>
              </div>
            </div>
          </div>
        )
      }

      {
        selectedGame && (
          <GameDetails
            game={selectedGame}
            onClose={() => setSelectedGame(null)}
            onLaunch={handleLaunch}
            onRemove={handleRemove}
            onUpdate={handleUpdateGame}
          />
        )
      }
    </div>
  )
}

export default App
