import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    getGames: () => ipcRenderer.invoke('get-games'),
    addGame: (game: any) => ipcRenderer.invoke('add-game', game),
    removeGame: (id: string) => ipcRenderer.invoke('remove-game', id),
    updateGame: (game: any) => ipcRenderer.invoke('update-game', game),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
    launchGame: (path: string) => ipcRenderer.invoke('launch-game', path),
    getTutorialStatus: () => ipcRenderer.invoke('get-tutorial-status'),
    setTutorialStatus: (status: boolean) => ipcRenderer.invoke('set-tutorial-status', status),
    checkGame: (id: string) => ipcRenderer.invoke('check-game', id),
    checkAllUpdates: () => ipcRenderer.invoke('check-all-updates'),
    refreshMetadata: (name: string) => ipcRenderer.invoke('refresh-metadata', name),
    getSessionToken: () => ipcRenderer.invoke('get-session-token'),
    setSessionToken: (token: string) => ipcRenderer.invoke('set-session-token', token),
    getSessionCookieName: () => ipcRenderer.invoke('get-session-cookie-name'),
    setSessionCookieName: (name: string) => ipcRenderer.invoke('set-session-cookie-name', name),
    testSession: () => ipcRenderer.invoke('test-session'),
    loginViaBrowser: () => ipcRenderer.invoke('login-via-browser'),
    getIGDBCredentials: () => ipcRenderer.invoke('get-igdb-credentials'),
    setIGDBCredentials: (creds: any) => ipcRenderer.invoke('set-igdb-credentials', creds),
    testIGDB: () => ipcRenderer.invoke('test-igdb'),

    // Event listeners
    onUpdateStatus: (callback: (data: any) => void) => {
        // Allow multiple listeners if needed, or just one
        const subscription = (_event: any, data: any) => callback(data)
        ipcRenderer.on('update-status', subscription)
        return () => ipcRenderer.removeListener('update-status', subscription)
    }
})
