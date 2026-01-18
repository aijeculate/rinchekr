export interface Game {
    id: string
    name: string
    url: string
    lastUpdated: string | null
    lastChecked: string | null
    status: 'up-to-date' | 'update-available' | 'new-activity' | 'error' | 'checking'
    imageUrl?: string
    description?: string
    genres?: string[]
    updateType?: 'release' | 'activity' | 'none'
    version?: string
    size?: string
    lastPostUrl?: string
    executablePath?: string
    debugLatestPostUrl?: string;
    debugUpdatePostUrl?: string; // URL of the post that triggered the update status
    debugNote?: string;
    lastKnownUpdateUrl?: string; // The URL of the last confirmed update (to avoid repeat notifications)
    debugLatestPostText?: string; // Snippet of the latest post
    debugUpdatePostText?: string; // Snippet of the update post
}

export interface ElectronApi {
    getGames: () => Promise<Game[]>
    addGame: (input: { name: string, url: string }) => Promise<Game>
    removeGame: (id: string) => Promise<boolean>
    updateGame: (game: Game) => Promise<Game>
    checkUpdate: (url: string) => Promise<any>
    checkAllUpdates: () => Promise<void>
    checkGame: (id: string) => Promise<any>
    refreshMetadata: (name: string) => Promise<any>
    getSessionToken: () => Promise<string>
    setSessionToken: (token: string) => Promise<boolean>
    getSessionCookieName: () => Promise<string>
    setSessionCookieName: (name: string) => Promise<boolean>
    testSession: () => Promise<{ success: boolean, message: string }>
    loginViaBrowser: () => Promise<{ success: boolean; message: string }>
    getIGDBCredentials: () => Promise<{ clientId: string, clientSecret: string }>
    setIGDBCredentials: (creds: { clientId: string, clientSecret: string }) => Promise<boolean>
    testIGDB: () => Promise<{ success: boolean, message: string }>
    openExternal: (url: string) => Promise<void>
    previewUpdate: (url: string) => Promise<void>
    launchGame: (path: string) => Promise<boolean>
    onUpdateStatus: (callback: (data: any) => void) => void
}
