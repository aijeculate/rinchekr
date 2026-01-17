import React, { useState } from 'react';
import { Play, Trash2, Globe, Calendar, Save, RefreshCw, CheckCircle, Activity, Zap, AlertCircle, Search, Info } from 'lucide-react';
import { Game } from '../types';

interface GameDetailsProps {
    game: Game;
    onClose: () => void;
    onLaunch: (path: string) => void;
    onRemove: (id: string) => void;
    onUpdate: (game: Game) => void;
}

export const GameDetails: React.FC<GameDetailsProps> = ({ game, onClose, onLaunch, onRemove, onUpdate }) => {
    // Editable Fields
    const [name, setName] = useState(game.name);
    const [path, setPath] = useState(game.executablePath || '');
    const [imageUrl, setImageUrl] = useState(game.imageUrl || '');
    const [url, setUrl] = useState(game.url || '');
    const [description, setDescription] = useState(game.description || '');
    const [genres, setGenres] = useState<string[]>(game.genres || []);

    // UI State
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [urlError, setUrlError] = useState('');

    const handleSave = () => {
        if (!validateUrl(url)) {
            // Force error to be seen if trying to save bad URL
            return;
        }

        onUpdate({
            ...game,
            name: name,
            url: url,
            executablePath: path,
            imageUrl: imageUrl,
            description: description,
            genres: genres
        });
    };

    const validateUrl = (val: string) => {
        if (!val.includes('cs.rin.ru/forum/viewtopic.php')) {
            setUrlError('Must be a valid CS.RIN.RU viewtopic link');
            return false;
        }
        setUrlError('');
        return true;
    };

    const handleRefreshMetadata = async () => {
        if (!name) return;
        setIsRefreshing(true);
        try {
            const data = await window.api.refreshMetadata(name);
            if (data.imageUrl) setImageUrl(data.imageUrl);
            if (data.description) setDescription(data.description);
            if (data.genres) setGenres(data.genres);
        } catch (e) {
            console.error(e);
        } finally {
            setIsRefreshing(false);
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
        <div className="modal-overlay">
            <div className="modal glass" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2>Game Details</h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <div
                        className={`status-badge ${game.status}`}
                        title={getStatusTooltip(game.status)}
                        style={{ position: 'static' }}
                    >
                        {game.status === 'checking' && <RefreshCw className="spin" size={14} />}
                        {game.status === 'up-to-date' && <CheckCircle size={14} />}
                        {game.status === 'update-available' && <Zap size={14} />}
                        {game.status === 'new-activity' && <Activity size={14} />}
                        {game.status === 'error' && <AlertCircle size={14} />}
                        <span style={{ marginLeft: '6px' }}>{game.status.replace('-', ' ')}</span>
                    </div>
                </div>

                <div className="form-group">
                    <label>Game Name</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <button
                            className="btn-secondary"
                            onClick={handleRefreshMetadata}
                            disabled={isRefreshing}
                            title="Fetch Metadata from Steam based on Name"
                        >
                            {isRefreshing ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
                            <span style={{ marginLeft: '6px' }}>Fetch Info</span>
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Forum Topic URL</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={url}
                            className={urlError ? 'input-error' : ''}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                validateUrl(e.target.value);
                            }}
                        />
                        <button className="btn-icon" onClick={() => window.api.openExternal(url)} title="Open in Browser"><Globe size={18} /></button>
                    </div>
                    {urlError && <span style={{ color: 'var(--danger)', fontSize: '0.8em' }}>{urlError}</span>}
                </div>

                {/* Rich Metadata Section */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    {imageUrl && (
                        <div style={{ width: '120px', flexShrink: 0 }}>
                            <img src={imageUrl} alt="Cover" style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }} />
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        {description && (
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={14} /> Description</label>
                                <textarea
                                    value={description}
                                    readOnly
                                    style={{
                                        width: '100%', background: 'var(--bg-card)',
                                        border: '1px solid var(--border)', borderRadius: '6px',
                                        color: 'var(--text-primary)', fontSize: '0.95em', lineHeight: '1.6',
                                        padding: '12px', minHeight: '120px', maxHeight: '300px',
                                        resize: 'vertical', fontFamily: 'sans-serif'
                                    }}
                                />
                            </div>
                        )}
                        {genres && genres.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {genres.map(g => (
                                    <span key={g} style={{
                                        fontSize: '0.75em', padding: '2px 8px', borderRadius: '12px',
                                        background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)'
                                    }}>
                                        {g}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label>Launch Configuration (Path to .exe)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="C:\Games\Game.exe"
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                        />
                        <button
                            className="btn-primary"
                            onClick={() => {
                                if (validateUrl(url)) {
                                    handleSave();
                                    onLaunch(path);
                                }
                            }}
                            disabled={!path}
                            title="Save & Launch"
                        >
                            <Play size={16} fill="currentColor" />
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Cover Image URL (Optional)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="https://..."
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    <Calendar size={16} />
                    <span>Last Checked: {game.lastChecked ? new Date(game.lastChecked).toLocaleString() : 'Never'}</span>
                </div>

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <button onClick={() => onRemove(game.id)} className="btn-icon danger" title="Delete Game">
                        <Trash2 size={18} />
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={onClose} className="btn-secondary">Close</button>
                        <button onClick={handleSave} className="btn-primary" disabled={!!urlError}>
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
