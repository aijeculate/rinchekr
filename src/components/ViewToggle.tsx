import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, setViewMode }) => {
    return (
        <div className="view-toggle">
            <button
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
            >
                <List size={18} />
            </button>
            <button
                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
            >
                <LayoutGrid size={18} />
            </button>
        </div>
    );
};
