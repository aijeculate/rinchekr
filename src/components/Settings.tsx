import React from 'react';
import { X, Moon, Sun, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    scale: number;
    setScale: (scale: number) => void;
    darkMode: boolean;
    toggleTheme: () => void;
    onShowTutorial: () => void;
}

const IGDBSettings: React.FC = () => {
    const [clientId, setClientId] = React.useState('');
    const [clientSecret, setClientSecret] = React.useState('');
    const [status, setStatus] = React.useState<{ success: boolean, message: string } | null>(null);
    const [isTesting, setIsTesting] = React.useState(false);

    // Load credentials on mount
    React.useEffect(() => {
        window.api.getIGDBCredentials().then((c) => {
            setClientId(c.clientId || '');
            setClientSecret(c.clientSecret || '');
        });
    }, []);

    const handleSaveAndTest = async () => {
        setIsTesting(true);
        setStatus(null);
        // Save first
        await window.api.setIGDBCredentials({ clientId, clientSecret });

        try {
            const res = await window.api.testIGDB();
            setStatus(res);
        } catch (e) {
            setStatus({ success: false, message: 'Test Error' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div style={{ background: 'var(--bg-surface-hover)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Client ID</label>
                <input
                    type="password"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="Twitch App Client ID"
                    style={{ width: '100%', fontFamily: 'monospace', padding: '8px', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}
                />
            </div>
            <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Client Secret</label>
                <input
                    type="password"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    placeholder="Twitch App Client Secret"
                    style={{ width: '100%', fontFamily: 'monospace', padding: '8px', fontSize: '0.9em', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}
                />
            </div>
            <button
                className="btn-secondary"
                onClick={handleSaveAndTest}
                disabled={isTesting || !clientId || !clientSecret}
                style={{ width: '100%', padding: '8px', fontSize: '0.9em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
                {isTesting ? 'Verifying...' : 'Save & Test Connection'}
            </button>
            {status && (
                <div style={{
                    marginTop: '12px',
                    fontSize: '0.8em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    color: status.success ? 'var(--success)' : 'var(--danger)',
                }}>
                    {status.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {status.message}
                </div>
            )}
        </div>
    );
};

export const Settings: React.FC<SettingsProps> = ({
    isOpen, onClose, scale, setScale, darkMode, toggleTheme, onShowTutorial
}) => {
    const [testStatus, setTestStatus] = React.useState<{ success: boolean, message: string } | null>(null);
    const [isTesting, setIsTesting] = React.useState(false);

    // Track if we have a valid session token (indicates "Logged In")
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);

    const checkLoginState = async () => {
        const token = await window.api.getSessionToken();
        // We consider it logged in if there is a token/cookie stored
        setIsLoggedIn(!!token);
    };

    React.useEffect(() => {
        if (isOpen) {
            setTestStatus(null);
            checkLoginState();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal glass settings-modal" style={{ width: '480px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <h2>Settings</h2>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>

                    {/* Appearance Section */}
                    <div className="form-group">
                        <label>Appearance</label>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <button
                                onClick={toggleTheme}
                                className={`btn-secondary ${darkMode ? 'active' : ''}`}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                                <span>{darkMode ? 'Dark' : 'Light'}</span>
                            </button>
                        </div>

                        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>UI Scale & Help</span>
                            <span>{Math.round(scale * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            min="0.75"
                            max="1.5"
                            step="0.05"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            style={{ width: '100%', marginTop: '8px', marginBottom: '12px' }}
                        />
                        <button className="btn-secondary" onClick={onShowTutorial} style={{ width: '100%', padding: '8px' }}>
                            Show Tutorial
                        </button>
                    </div>

                    {/* CS.RIN.RU Login Section */}
                    <div className="form-group" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                        <label>Forum Access</label>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            Required to download update links.
                        </p>

                        <div style={{ background: 'var(--bg-surface-hover)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.9em', fontWeight: 500 }}>Status:</span>
                                {isLoggedIn ? (
                                    <span style={{ color: 'var(--success)', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle size={14} /> Logged In
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>Not Logged In</span>
                                )}
                            </div>

                            <button
                                className="btn-primary"
                                style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onClick={async () => {
                                    setIsTesting(true);
                                    try {
                                        const result = await window.api.loginViaBrowser();
                                        setTestStatus(result);
                                        await checkLoginState(); // Refresh status check
                                    } catch (e) {
                                        setTestStatus({ success: false, message: 'Login cancelled or failed' });
                                    } finally {
                                        setIsTesting(false);
                                    }
                                }}
                                disabled={isTesting}
                            >
                                <span>🔐</span>
                                {isTesting ? 'Waiting...' : (isLoggedIn ? 'Reauthorize Account (Refresh Tokens)' : 'Login via Browser')}
                            </button>

                            {testStatus && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    background: testStatus.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: testStatus.success ? 'var(--success)' : 'var(--danger)',
                                    fontSize: '0.85em',
                                    textAlign: 'center'
                                }}>
                                    {testStatus.message}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* IGDB Section */}
                    <div className="form-group" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                        <label>Metadata Sources (Optional)</label>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            IGDB integration allows fetching metadata for non-Steam games (e.g. Hytale).
                        </p>
                        <IGDBSettings />
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '24px' }}>
                        <h3 style={{ fontSize: '1rem', marginTop: 0 }}>About</h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            <p style={{ margin: '4px 0' }}><strong>CS.RIN.RU Update Checker</strong> v3.18.7</p>
                            <p style={{ margin: '4px 0' }}>Premium game manager & update tracker.</p>
                            <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85em' }}>
                                <p>RinChekr v3.18.7</p>
                                <p style={{ marginTop: '4px' }}>Created by <span style={{ color: 'var(--accent)', fontWeight: 600 }}>aijeculate</span></p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
