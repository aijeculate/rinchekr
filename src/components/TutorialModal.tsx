import React from 'react';
import { AlertTriangle, Shield, BookOpen } from 'lucide-react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = React.useState(0);

    if (!isOpen) return null;

    const slides = [
        {
            title: "Welcome to RinChekr",
            icon: <Shield size={48} color="var(--primary)" />,
            content: (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '16px' }}>
                        The premium update tracker for your CS.RIN.RU library.
                    </p>
                    <p style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                        We help you track updates, find new releases, and manage your collection efficiently.
                    </p>
                </div>
            )
        },
        {
            title: "How it Works",
            icon: <BookOpen size={48} color="var(--accent)" />,
            content: (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '16px' }}>
                        Simply add a game by its forum URL. RinChekr scans the topic for new posts.
                    </p>
                    <ul style={{ textAlign: 'left', background: 'var(--bg-surface-hover)', padding: '12px 24px', borderRadius: '8px', fontSize: '0.9em' }}>
                        <li style={{ marginBottom: '8px' }}>🤖 <strong>Smart Scanning:</strong> We filter out chatter.</li>
                        <li>📅 <strong>Updates:</strong> Get notified instantly.</li>
                    </ul>
                </div>
            )
        },
        {
            title: "Important: Authentication",
            icon: <AlertTriangle size={48} color="var(--warning)" />,
            content: (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        <strong>Sessions Expire!</strong>
                    </div>
                    <p style={{ fontSize: '0.9em', marginBottom: '12px' }}>
                        CS.RIN.RU logs you out periodically for security.
                    </p>
                    <p style={{ fontSize: '0.9em' }}>
                        If you see <span style={{ color: 'var(--danger)' }}>"No posts found"</span> or <span style={{ color: 'var(--danger)' }}>"Unauthorized"</span> errors:
                    </p>
                    <p style={{ fontWeight: 'bold', marginTop: '12px', color: 'var(--primary)' }}>
                        Settings → "Reauthorize Account"
                    </p>
                </div>
            )
        }
    ];

    const currentSlide = slides[step];
    const isLast = step === slides.length - 1;

    return (
        <div className="modal-overlay">
            <div className="modal glass" style={{ width: '400px', textAlign: 'center', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    {currentSlide.icon}
                </div>

                <h2 style={{ marginBottom: '16px' }}>{currentSlide.title}</h2>

                <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {currentSlide.content}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
                    {slides.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: i === step ? 'var(--primary)' : 'var(--border)',
                                transition: 'all 0.3s'
                            }}
                        />
                    ))}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    {step > 0 ? (
                        <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>
                    ) : (
                        <div /> // Spacer
                    )}

                    <button
                        className="btn-primary"
                        onClick={() => {
                            if (isLast) onClose();
                            else setStep(s => s + 1);
                        }}
                        style={{ padding: '8px 24px' }}
                    >
                        {isLast ? 'Get Started' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};
