import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { getIGDBToken, searchIGDB } from './igdb'
import { calculatePostScore } from './scorer'

// Types
interface Game {
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
    debugLatestPostUrl?: string
    debugUpdatePostUrl?: string
    debugNote?: string
    lastKnownUpdateUrl?: string
    debugLatestPostText?: string
    debugUpdatePostText?: string
}

const store = new Store<{
    games: Game[],
    sessionToken?: string,
    sessionCookieName?: string,
    sessionCookies?: any[],
    userAgent?: string,
    igdbClientId?: string,
    igdbClientSecret?: string,
    igdbAccessToken?: string,
    igdbTokenExpiry?: number,
    hasSeenTutorial?: boolean
}>(
    {
        defaults: {
            games: [],
            hasSeenTutorial: false
        }
    }
)
let win: BrowserWindow | null = null

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        backgroundColor: '#0f172a',
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0f172a',
            symbolColor: '#f1f5f9',
            height: 35
        },
        icon: path.join(__dirname, '../build/RinChekr.ico')
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()

    // Helper to fetch metadata from page
    // Helper: Clean and Validate URL
    const cleanRinUrl = (url: string): string | null => {
        try {
            const u = new URL(url)
            if (!u.hostname.includes('cs.rin.ru')) return null

            // Extract topic ID
            const t = u.searchParams.get('t')
            if (!t) return null

            // Reconstruct clean URL
            return `https://cs.rin.ru/forum/viewtopic.php?t=${t}`
        } catch (e) {
            return null
        }
    }

    // Cloudflare-compatible User Agent
    const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // Helper: Fetch Metadata using Hidden Browser Window (Bypass Cloudflare)
    const fetchMetadata = async (url: string) => {
        return new Promise<{ title: string, imageUrl?: string, steamAppId?: string | null }>((resolve) => {
            const fetcher = new BrowserWindow({
                show: false, // Hidden
                width: 800,
                height: 600,
                webPreferences: {
                    offscreen: true, // Render offscreen
                    images: false // Save bandwidth
                }
            })

            let retries = 0;
            const maxRetries = 1; // Try once more if hit generic CF page

            // Timeout safety (increased for CF)
            const timeout = setTimeout(() => {
                if (!fetcher.isDestroyed()) fetcher.destroy();
                resolve({ title: '' });
            }, 25000);

            fetcher.webContents.on('did-finish-load', async () => {
                try {
                    const title = fetcher.getTitle();

                    // Cloudflare Detection & Wait Logic
                    if (title.match(/Just a moment|Security Check|Attention Required|Cloudflare/i)) {
                        if (retries < maxRetries) {
                            retries++;
                            // Wait for JS challenge to complete
                            // console.log('CF Detect, waiting...');
                            // We don't need to reload, just wait. The page usually reloads itself.
                            // But keeping the timeout alive is key.
                            return;
                        } else {
                            // Timed out or failed
                            if (!fetcher.isDestroyed()) fetcher.destroy();
                            clearTimeout(timeout);
                            resolve({ title: '' }); // Failed to bypass
                            return;
                        }
                    }

                    const cleanTitle = title.replace(/.*View topic - /, '').replace(' - CS.RIN.RU - Steam Underground Community', '').trim();

                    // Scrape for Steam Store Link
                    const steamAppId = await fetcher.webContents.executeJavaScript(`
                        (() => {
                            const links = Array.from(document.querySelectorAll('a[href*="store.steampowered.com/app/"]'));
                            for (const link of links) {
                                const match = link.href.match(/store\\.steampowered\\.com\\/app\\/(\\d+)/);
                                if (match) return match[1];
                            }
                            return null;
                        })()
                    `);

                    if (!fetcher.isDestroyed()) fetcher.destroy();
                    clearTimeout(timeout);
                    resolve({ title: cleanTitle, steamAppId });

                } catch (e) {
                    if (!fetcher.isDestroyed()) fetcher.destroy();
                    clearTimeout(timeout);
                    resolve({ title: '' });
                }
            })

            // Inject Session Cookies
            const sessionCookies = store.get('sessionCookies');
            if (sessionCookies && Array.isArray(sessionCookies) && sessionCookies.length > 0) {
                sessionCookies.forEach(c => {
                    const details = {
                        url: 'https://cs.rin.ru',
                        name: c.name,
                        value: c.value,
                        domain: c.domain,
                        path: c.path,
                        secure: c.secure,
                        httpOnly: c.httpOnly
                    };
                    fetcher.webContents.session.cookies.set(details).catch(e => console.error('Cookie set error:', c.name, e));
                });
            } else {
                // Fallback to single token
                const token = store.get('sessionToken');
                const cookieName = store.get('sessionCookieName') || 'phpbb3_frn0e_sid';
                if (token) {
                    const cookie = {
                        url: 'https://cs.rin.ru',
                        name: cookieName,
                        value: token
                    };
                    fetcher.webContents.session.cookies.set(cookie).catch(e => console.error('Cookie error:', e));
                }
            }

            const storedUA = store.get('userAgent');
            fetcher.loadURL(url, { userAgent: storedUA || USER_AGENT })
        })
    }

    // Helper: Fetch Details by Steam App ID (Precise)
    const fetchSteamDetailsById = async (appId: string) => {
        try {
            const { net } = require('electron')
            const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
            const detailsReq = net.request(detailsUrl);

            return new Promise<{ imageUrl?: string, name?: string, description?: string, genres?: string[] }>((resolve) => {
                let detailsData = '';
                detailsReq.on('response', (dRes: any) => {
                    dRes.on('data', (c: Buffer) => detailsData += c.toString());
                    dRes.on('end', () => {
                        try {
                            const dJson = JSON.parse(detailsData);
                            if (dJson[appId] && dJson[appId].success) {
                                const data = dJson[appId].data;
                                resolve({
                                    imageUrl: data.header_image,
                                    name: data.name,
                                    description: data.short_description,
                                    genres: data.genres ? data.genres.map((g: any) => g.description) : []
                                });
                            } else {
                                resolve({});
                            }
                        } catch (e) { resolve({}); }
                    });
                });
                detailsReq.on('error', () => resolve({}));
                detailsReq.end();
            })
        } catch (e) {
            return {};
        }
    }

    // Helper to search Steam Store
    const searchSteamMetadata = async (query: string) => {
        try {
            const { net } = require('electron')
            // Steam Store Search API
            const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`
            const request = net.request(searchUrl)

            return new Promise<{ imageUrl?: string, name?: string, description?: string, genres?: string[] }>((resolve) => {
                let data = ''
                request.on('response', (response: any) => {
                    response.on('data', (chunk: Buffer) => { data += chunk.toString() })
                    response.on('end', () => {
                        try {
                            const json = JSON.parse(data)
                            if (json.total > 0 && json.items && json.items.length > 0) {
                                const item = json.items[0] // Take first result

                                // Fetch details for this app to get genres/desc? 
                                // Store Search API gives tiny_image and name. 
                                // We might need a second call for details, but for now let's just use what we can or mock.
                                // Actually, Store Search is limited. Let's try to get game details if possible or just stick to image/name for speed.
                                // Refinement: Using a public store API for details: https://store.steampowered.com/api/appdetails?appids=...

                                const appId = item.id;
                                if (appId) {
                                    const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
                                    const detailsReq = net.request(detailsUrl);
                                    let detailsData = '';
                                    detailsReq.on('response', (dRes: any) => {
                                        dRes.on('data', (c: Buffer) => detailsData += c.toString());
                                        dRes.on('end', () => {
                                            try {
                                                const dJson = JSON.parse(detailsData);
                                                if (dJson[appId] && dJson[appId].success) {
                                                    const data = dJson[appId].data;
                                                    resolve({
                                                        imageUrl: data.header_image,
                                                        name: data.name,
                                                        description: data.short_description,
                                                        genres: data.genres ? data.genres.map((g: any) => g.description) : []
                                                    });
                                                } else {
                                                    resolve({ imageUrl: item.tiny_image, name: item.name });
                                                }
                                            } catch (e) { resolve({ imageUrl: item.tiny_image, name: item.name }); }
                                        });
                                    });
                                    detailsReq.end();
                                } else {
                                    resolve({ imageUrl: item.tiny_image, name: item.name })
                                }

                            } else {
                                resolve({})
                            }
                        } catch (e) { resolve({}) }
                    })
                })
                request.on('error', () => resolve({}))
                request.end()
            })
        } catch (e) {
            return {}
        }
    }

    // Helper: Check for Updates (Real Logic)
    const checkForUpdates = async (url: string, lastPostUrl?: string, lastKnownUpdateUrl?: string) => {
        return new Promise<{ status: Game['status'], lastPostUrl?: string, updateDate?: string, lastKnownUpdateUrl?: string, debugLatestPostUrl?: string, debugUpdatePostUrl?: string, debugNote?: string, debugLatestPostText?: string, debugUpdatePostText?: string }>((resolve) => {
            const fetcher = new BrowserWindow({
                show: false,
                width: 1024,
                height: 800,
                webPreferences: { offscreen: true } // Render offscreen
            })
            // fetcher.webContents.openDevTools({ mode: 'detach' });

            let retries = 0;
            const maxRetries = 1;

            const timeout = setTimeout(() => {
                if (!fetcher.isDestroyed()) fetcher.destroy();
                resolve({ status: 'error', debugNote: 'Timeout waiting for page load' });
            }, 45000); // 45s timeout

            fetcher.webContents.on('did-finish-load', async () => {
                try {
                    const title = fetcher.getTitle();
                    // Cloudflare check
                    if (title.includes('Just a moment') || title.includes('Attention Required')) {
                        console.log('Cloudflare detected (Update Check). Retries:', retries);
                        if (retries < maxRetries) {
                            retries++;
                            return;
                        }
                        if (!fetcher.isDestroyed()) fetcher.destroy();
                        clearTimeout(timeout);
                        resolve({ status: 'error', debugNote: 'Blocked by Cloudflare (Security Check)' });
                        return;
                    }

                    // Scrape Posts
                    const posts = await fetcher.webContents.executeJavaScript(`
                        (() => {
                            // Strategy 1: Look for div[id^="p"] but strictly numeric suffix (e.g. p153567)
                            const allP = Array.from(document.querySelectorAll('div[id^="p"], table[id^="p"]'));
                            let posts = allP.filter(el => /^p\\d+$/.test(el.id));

                            if (posts.length === 0) {
                                // Fallback: classes .row1, .row2 (common in RIN tables)
                                posts = Array.from(document.querySelectorAll('.row1, .row2'));
                                // Filter to ensure they contain a postbody or content
                                posts = posts.filter(el => el.querySelector('.postbody') || el.querySelector('.content'));
                            }
                            
                             if (posts.length === 0) {
                                // Last ditch: .postbody directly
                                const bodies = Array.from(document.querySelectorAll('.postbody'));
                                if (bodies.length > 0) {
                                    posts = bodies; 
                                }
                            }
                            
                            return posts.map((p, index) => {
                                // Content extraction
                                let content = p.querySelector('.content')?.innerHTML || '';
                                if (!content) {
                                    const pb = p.querySelector('.postbody');
                                    if (pb) content = pb.innerHTML;
                                    else content = p.innerHTML;
                                }
                                let text = (p instanceof HTMLElement) ? p.innerText : '';
                                // Clean up text (remove quotes, truncation)
                                text = text.replace(/Quote:[\s\S]*?wrote:/g, '') // Remove quote headers
                                           .replace(/\s+/g, ' ').trim();
                                if (text.length > 200) text = text.substring(0, 200) + '...';
                                
                                // robust URL & ID extraction
                                let url = '';
                                let id = p.id;

                                // Find any link to viewtopic
                                const links = Array.from(p.querySelectorAll('a[href*="viewtopic.php"]'));
                                // Prioritize links with #pXXXX or p=XXXX
                                const bestLink = links.find(l => l.href.includes('#p') || l.href.includes('p=')) || links[0];
                                
                                if (bestLink) {
                                    url = bestLink.href;
                                } else {
                                    // Fallback: Check header/subject
                                    const subj = p.querySelector('h3 a, .post-subject a');
                                    if (subj) url = subj.href;
                                }

                                // If ID is missing or generated/generic, try to extract from URL
                                if (!id || !/^p\\d+$/.test(id)) {
                                    if (url) {
                                        const match = url.match(/[?&]p=(\\d+)/) || url.match(/#p(\\d+)/);
                                        if (match) id = 'p' + match[1];
                                    }
                                    
                                    if (!id || !/^p\\d+$/.test(id)) {
                                         // Still no ID? Look for <a name="pXXXX"> inside
                                        const anchor = p.querySelector('a[name^="p"]');
                                        if (anchor) id = anchor.name;
                                        else id = 'generated_' + index;
                                    }
                                }
                                
                                return { id, content, text, url };
                            });
                        })()
                    `);

                    // Analyze Posts
                    let hasUpdate = false;

                    if (!posts || posts.length === 0) {
                        // DIAGNOSTICS: Why no posts?
                        const pageTitle = await fetcher.webContents.getTitle();
                        const pageUrl = fetcher.webContents.getURL();

                        let statusNote = 'No posts found on page';
                        let status: Game['status'] = 'up-to-date'; // Default to safe

                        if (pageTitle.includes('Login')) {
                            statusNote = 'Login Required (Page Title)';
                        } else if (pageTitle.includes('Cloudflare') || pageTitle.includes('Just a moment')) {
                            statusNote = 'Blocked by Cloudflare';
                        } else if (pageTitle.includes('Information')) {
                            statusNote = 'Generic Info Page (Topic Removed?)';
                        } else {
                            // Grab a snippet of body to see what's there
                            try {
                                const bodyText = await fetcher.webContents.executeJavaScript(`document.body.innerText.substring(0, 100)`);
                                statusNote = `Scraper Mismatch. Title: "${pageTitle}". Body: "${bodyText.replace(/\\n/g, ' ')}..."`;
                            } catch (e) {
                                statusNote = `Scraper Mismatch. Title: "${pageTitle}". (Body access failed)`;
                            }
                        }

                        console.log(`[Scrape Fail] ${statusNote} | URL: ${pageUrl}`);

                        // NOW we can destroy
                        if (!fetcher.isDestroyed()) fetcher.destroy();
                        clearTimeout(timeout);

                        resolve({ status: status, debugNote: statusNote });
                        return;
                    }

                    // Success case - destroy window
                    if (!fetcher.isDestroyed()) fetcher.destroy();
                    clearTimeout(timeout);

                    // Determine "Latest Post" (Cursor)
                    const lastPagePost = posts[posts.length - 1];
                    const latestPostUrl = lastPagePost ? lastPagePost.url : lastPostUrl;
                    let debugUpdatePostUrl = undefined;
                    let debugLatestPostText = lastPagePost?.text || '';
                    let debugUpdatePostText = undefined;
                    let debugNote = `Latest Post: ${lastPagePost?.id || '?'}`;
                    let resultStatus: Game['status'] = 'up-to-date';
                    let newLastKnownUpdateUrl = lastKnownUpdateUrl;

                    // Check Logic
                    if (lastPagePost && lastPagePost.url !== lastPostUrl) {

                        // Look for updates in the new posts (or all posts on page if needed, but usually new ones)
                        // Iterate backwards to find the *latest* update if multiple
                        for (let i = posts.length - 1; i >= 0; i--) {
                            const p = posts[i];
                            const score = calculatePostScore(p.content, p.text);

                            if (score > 15) {
                                hasUpdate = true;
                                debugUpdatePostUrl = p.url;
                                debugUpdatePostText = p.text;

                                // Persistent Update Check:
                                // If this update URL matches what we already know, it's not "Update Available" AGAIN.
                                if (p.url === lastKnownUpdateUrl) {
                                    debugNote = `Update Found (Seen): ${score} (Post: ${p.id})`;
                                    resultStatus = 'up-to-date'; // Treat as up-to-date user-facing
                                } else {
                                    debugNote = `Update Found! Score: ${score} (Post: ${p.id})`;
                                    resultStatus = 'update-available';
                                    newLastKnownUpdateUrl = p.url; // Save this as the new known update
                                }
                                break; // Found an update!
                            } else if (score > 0) {
                                // Just interesting activity
                            }
                        }

                        if (!hasUpdate) {
                            resultStatus = 'new-activity';
                            debugNote = 'New activity found (No verified update)';
                        }

                    } else {
                        debugNote = 'No new posts found (Up to date)';
                        resultStatus = 'up-to-date';
                    }

                    // Fallback: If status is 'update-available' but we decided it's seen, it's 'up-to-date'.
                    // If we found NO new activity but there IS a known updateUrl that matches the latest post on page? 
                    // No, simpler: if logic says 'update-available', we return it.

                    resolve({
                        status: resultStatus,
                        lastPostUrl: latestPostUrl,
                        updateDate: resultStatus === 'update-available' ? new Date().toISOString() : undefined,
                        lastKnownUpdateUrl: newLastKnownUpdateUrl,
                        debugLatestPostUrl: latestPostUrl,
                        debugUpdatePostUrl: debugUpdatePostUrl,
                        debugNote: debugNote,
                        debugLatestPostText: debugLatestPostText,
                        debugUpdatePostText: debugUpdatePostText
                    });
                } catch (e) {
                    // if (!fetcher.isDestroyed()) fetcher.destroy();
                    clearTimeout(timeout);
                    resolve({ status: 'error', debugNote: `Script Error: ${e}` });
                }
            })

            // Inject Cookies & UA
            const sessionCookies = store.get('sessionCookies');
            const token = store.get('sessionToken');
            const cookieName = store.get('sessionCookieName') || 'phpbb3_frn0e_sid';
            const storedUA = store.get('userAgent') || USER_AGENT;

            if (sessionCookies && Array.isArray(sessionCookies)) {
                sessionCookies.forEach(c => {
                    fetcher.webContents.session.cookies.set({
                        url: 'https://cs.rin.ru', name: c.name, value: c.value, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly
                    }).catch(() => { });
                });
            } else if (token) {
                fetcher.webContents.session.cookies.set({ url: 'https://cs.rin.ru', name: cookieName, value: token }).catch(() => { });
            }

            // Force Load Last Page
            // phpBB trick: start=9999999
            const checkUrl = url + (url.includes('?') ? '&' : '?') + 'start=9999999';
            fetcher.loadURL(checkUrl, { userAgent: storedUA });
        })
    }
    ipcMain.handle('get-games', () => {
        return store.get('games', [])
    })

    ipcMain.handle('add-game', async (_event, gameInput: Game) => {
        const games = store.get('games', [])

        let name = gameInput.name
        let imageUrl = gameInput.imageUrl

        // 0. Validate and Clean URL
        const cleanUrl = cleanRinUrl(gameInput.url);
        if (!cleanUrl) {
            throw new Error('Invalid URL')
        }
        const finalUrl = cleanUrl;

        let steamAppId: string | undefined;

        // 1. If name is missing, fetch "Real" Browser Metadata
        if (!name && finalUrl) {
            const pageData = await fetchMetadata(finalUrl)
            // Only use page title if it's NOT empty (filtered above)
            if (pageData.title) {
                name = pageData.title
            }
            if (pageData.steamAppId) {
                steamAppId = pageData.steamAppId;
            }
        }

        // 2. Search Steam if we have a name (or found one cleanly)
        let steamData: any = {};

        // PRIORITY: If we found a Steam App ID in the forum post, USE IT!
        if (steamAppId) {
            const details = await fetchSteamDetailsById(steamAppId);
            if (details.name) {
                steamData = details;
                // Override whatever name we found locally with the official Steam Name
                name = details.name || name;
                imageUrl = details.imageUrl;
            }
        }
        // FALLBACK 1: Search Steam by name if we didn't find an ID
        else if (name) {
            const searchName = name.replace(/v\d+(\.\d+)*|\[.*?\]|\(.*?\)/g, '').trim()
            steamData = await searchSteamMetadata(searchName)
            if (steamData.imageUrl) {
                imageUrl = steamData.imageUrl
                name = steamData.name || name
            }
        }

        // FALLBACK 2: IGDB Search (If Steam failed)
        if (!steamData.imageUrl && !imageUrl) {
            const clientId = store.get('igdbClientId');
            const clientSecret = store.get('igdbClientSecret');
            if (clientId && clientSecret) {
                // Check for valid token
                let token = store.get('igdbAccessToken');
                const expiry = store.get('igdbTokenExpiry') || 0;

                if (!token || Date.now() > expiry) {
                    const tokenData = await getIGDBToken(clientId, clientSecret);
                    if (tokenData) {
                        token = tokenData.access_token;
                        store.set('igdbAccessToken', token);
                        store.set('igdbTokenExpiry', Date.now() + (tokenData.expires_in * 1000));
                    }
                }

                if (token) {
                    const searchName = (name || '').replace(/v\d+(\.\d+)*|\[.*?\]|\(.*?\)/g, '').trim();
                    const igdbData = await searchIGDB(searchName, clientId, token);
                    if (igdbData) {
                        imageUrl = igdbData.cover;
                        name = igdbData.name || name;
                        // Store IGDB data if we want
                        steamData = { description: igdbData.summary, genres: igdbData.genres };
                    }
                }
            }
        }

        const newGame: Game = {
            ...gameInput,
            id: Date.now().toString(),
            name: name || 'New Game (Click to Edit)', // Better fallback
            url: finalUrl,
            imageUrl: imageUrl,
            description: (name === steamData.name) ? steamData.description : undefined,
            genres: (name === steamData.name) ? steamData.genres : undefined,
            status: 'up-to-date',
            lastUpdated: new Date().toISOString(),
            lastChecked: new Date().toISOString()
        }

        const newGames = [...games, newGame]
        store.set('games', newGames)
        return newGame
    })

    ipcMain.handle('remove-game', (_event, id: string) => {
        const games = store.get('games', [])
        store.set('games', games.filter(g => g.id !== id))
        return true
    })

    ipcMain.handle('update-game', (_event, updatedGame: Game) => {
        const games = store.get('games', [])
        store.set('games', games.map(g => g.id === updatedGame.id ? updatedGame : g))
        return updatedGame
    })

    ipcMain.handle('open-external', (_event, url: string) => {
        shell.openExternal(url)
    })

    ipcMain.handle('launch-game', async (_event, path) => {
        try {
            console.log('Launching:', path)
            // shell.openPath is safer and supports all file types (vbs, lnk, bat, exe)
            // It opens the file as if the user double-clicked it in Explorer.
            const result = await shell.openPath(path);
            if (result) {
                console.error('Launch failed:', result);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Launch error:', e)
            return false
        }
    });

    ipcMain.handle('check-update', async (_event, _url: string) => {
        // Logic to detect updates. 
        // Since we can't bypass Cloudflare easily for forum parsing, 
        // we default to 'up-to-date' to avoid false positives.
        // In a real app, this would use puppets or a signed cookie.
        return {
            status: 'up-to-date',
            lastUpdated: new Date().toISOString()
        }
    })

    ipcMain.handle('check-game', async (_event, id: string) => {
        const games = store.get('games', [])
        const gameId = id; // use variable
        const gameIndex = games.findIndex(g => g.id === gameId);

        if (gameIndex === -1) return null;

        const game = games[gameIndex];

        // Use Real Logic
        const result = await checkForUpdates(game.url, game.lastPostUrl, game.lastKnownUpdateUrl);

        // Merge updates
        const updatedGame = {
            ...game,
            status: result.status,
            lastPostUrl: result.lastPostUrl,
            lastKnownUpdateUrl: result.lastKnownUpdateUrl || game.lastKnownUpdateUrl,
            lastUpdated: result.updateDate || game.lastUpdated,
            lastChecked: new Date().toISOString(),
            debugLatestPostUrl: result.debugLatestPostUrl,
            debugUpdatePostUrl: result.debugUpdatePostUrl,
            debugNote: result.debugNote,
            debugLatestPostText: result.debugLatestPostText,
            debugUpdatePostText: result.debugUpdatePostText
        };

        // SAVE TO STORE!
        games[gameIndex] = updatedGame;
        store.set('games', games);

        return updatedGame;
    })

    ipcMain.handle('check-all-updates', async () => {
        const games = store.get('games', [])

        // Parallel check (limit concurrency ideally, but for now map is okay)
        // We'll process them one by one to avoid triggering Cloudflare Limits
        const updatedGames = [...games];

        for (let i = 0; i < updatedGames.length; i++) {
            const game = updatedGames[i];
            const result = await checkForUpdates(game.url, game.lastPostUrl, game.lastKnownUpdateUrl);

            updatedGames[i] = {
                ...game,
                status: result.status,
                lastPostUrl: result.lastPostUrl || game.lastPostUrl,
                lastKnownUpdateUrl: result.lastKnownUpdateUrl || game.lastKnownUpdateUrl,
                lastUpdated: result.updateDate || game.lastUpdated,
                lastChecked: new Date().toISOString(),
                debugLatestPostUrl: result.debugLatestPostUrl,
                debugUpdatePostUrl: result.debugUpdatePostUrl,
                debugNote: result.debugNote,
                debugLatestPostText: result.debugLatestPostText,
                debugUpdatePostText: result.debugUpdatePostText
            };

            store.set('games', updatedGames); // Save incrementally
            if (win) win.webContents.send('update-status', updatedGames[i]);

            // Wait a random bit to be nice to the server (1-3s)
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }

        store.set('games', updatedGames)
    })

    // New: Explicitly refresh metadata from Steam
    ipcMain.handle('refresh-metadata', async (_event, name: string) => {
        if (!name) return {};
        const searchName = name.replace(/v\d+(\.\d+)*|\[.*?\]|\(.*?\)/g, '').trim();
        return await searchSteamMetadata(searchName);
    })

    // Session Token Management
    ipcMain.handle('get-session-token', () => store.get('sessionToken', ''))
    ipcMain.handle('set-session-token', (_event, input: string) => {
        // ALWAYS save the raw input so the user sees exactly what they pasted
        store.set('sessionToken', input);

        const trimmed = input.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                const cookies = Array.isArray(parsed) ? parsed : [parsed];
                store.set('sessionCookies', cookies);
                return true;
            } catch (e) {
                console.error('JSON parse error', e);
                // Even if parse fails, we saved the raw token above, so it's safe.
                // We might want to clear old cookies if parse fails?
                // store.delete('sessionCookies'); 
                return false;
            }
        } else {
            // It's a simple string token
            store.delete('sessionCookies'); // Clear full cookies so we fallback to token logic
            return true;
        }
    })

    ipcMain.handle('get-session-cookie-name', () => store.get('sessionCookieName', 'phpbb3_frn0e_sid'))
    ipcMain.handle('set-session-cookie-name', (_event, name: string) => {
        store.set('sessionCookieName', name)
        return true
    })

    // Tutorial IPC
    ipcMain.handle('get-tutorial-status', () => {
        return store.get('hasSeenTutorial', false);
    });

    ipcMain.handle('set-tutorial-status', (_event, status: boolean) => {
        store.set('hasSeenTutorial', status);
        return true;
    });

    ipcMain.handle('login-via-browser', async () => {
        return new Promise((resolve) => {
            const loginWin = new BrowserWindow({
                width: 1024,
                height: 800,
                autoHideMenuBar: true,
                title: 'Login to CS.RIN.RU',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            // CRITICAL: Force Chrome User-Agent immediately
            // This ensures cookies are tied to this UA, and Cloudflare sees a "real" browser
            const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            loginWin.webContents.setUserAgent(USER_AGENT);

            // Listen for navigation to detect successful login
            loginWin.webContents.on('did-navigate', async (_event, url) => {
                // Check for index or UCP (not mode=login)
                // AND ensure we actually have a logged-in user cookie (u > 1)
                // This prevents closing on 'Board Index' as a guest or premature redirects
                if ((url.includes('index.php') || url.includes('ucp.php')) && !url.includes('mode=login')) {

                    const cookies = await loginWin.webContents.session.cookies.get({ domain: 'cs.rin.ru' });

                    // Check for User ID cookie to confirm login
                    // phpbb3_xxxxx_u where value > 1 (1 is Anonymous)
                    const userCookie = cookies.find(c => c.name.endsWith('_u') && parseInt(c.value) > 1);
                    const sidCookie = cookies.find(c => c.name.endsWith('_sid'));

                    if (userCookie && sidCookie) {
                        // Capture User Agent
                        const ua = loginWin.webContents.getUserAgent();
                        store.set('userAgent', ua);

                        store.set('sessionCookies', cookies);
                        store.set('sessionToken', 'BROWSER_LOGIN'); // Marker

                        setTimeout(() => {
                            if (!loginWin.isDestroyed()) loginWin.destroy();
                            resolve({ success: true, message: 'Login successful! Session captured.' });
                        }, 1500);
                    }
                }
            });

            loginWin.on('closed', () => {
                resolve({ success: false, message: 'Window closed' });
            });

            loginWin.loadURL('https://cs.rin.ru/forum/ucp.php');
        });
    });

    ipcMain.handle('test-session', async () => {
        const sessionCookies = store.get('sessionCookies');
        const token = store.get('sessionToken');
        const cookieName = store.get('sessionCookieName') || 'phpbb3_frn0e_sid';
        const storedUA = store.get('userAgent');

        if (!sessionCookies && !token) return { success: false, message: 'No token saved' };

        return new Promise((resolve) => {
            const tempWin = new BrowserWindow({ show: false, width: 800, height: 600 });

            // Use stored UA to match the session, or fallback to Chrome constant
            const USER_AGENT = storedUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

            const promises = [];

            if (sessionCookies && Array.isArray(sessionCookies)) {
                sessionCookies.forEach(c => {
                    const details = {
                        url: 'https://cs.rin.ru',
                        name: c.name,
                        value: c.value,
                        domain: c.domain,
                        path: c.path,
                        secure: c.secure,
                        httpOnly: c.httpOnly
                    };
                    promises.push(tempWin.webContents.session.cookies.set(details));
                });
            } else if (token) {
                const cookie = { url: 'https://cs.rin.ru', name: cookieName, value: token };
                promises.push(tempWin.webContents.session.cookies.set(cookie));
            }

            // Timeout safety - ensure we don't hang if CF never resolves
            const safetyTimeout = setTimeout(() => {
                if (!tempWin.isDestroyed()) tempWin.destroy();
                resolve({ success: false, message: 'Timeout (Cloudflare loop?)' });
            }, 10000);

            Promise.all(promises).then(() => {
                let retries = 0;

                tempWin.webContents.on('did-finish-load', () => {
                    const title = tempWin.getTitle();
                    const url = tempWin.webContents.getURL();

                    // Cloudflare Check
                    if (title.match(/Just a moment|Security Check|Attention Required|Cloudflare/i)) {
                        if (retries < 1) {
                            retries++;
                            // Wait for reload...
                            return;
                        }
                        // Failed
                        clearTimeout(safetyTimeout);
                        if (!tempWin.isDestroyed()) tempWin.destroy();
                        resolve({ success: false, message: 'Blocked by Cloudflare (Security Check)' });
                        return;
                    }

                    clearTimeout(safetyTimeout);

                    if (title.includes('Login') || url.includes('mode=login')) {
                        if (!tempWin.isDestroyed()) tempWin.destroy();
                        resolve({ success: false, message: 'Cookie invalid (Redirected to Login)' });
                    } else if (title.includes('User Control Panel') || title.includes('Index page')) {
                        if (!tempWin.isDestroyed()) tempWin.destroy();
                        resolve({ success: true, message: 'Connection Successful! Logged in.' });
                    } else if (title.includes('Security check failed')) {
                        // Handle the specific error user reported
                        if (!tempWin.isDestroyed()) tempWin.destroy();
                        resolve({ success: false, message: 'Security Check Failed (Cookies/UA Mismatch)' });
                    } else {
                        if (!tempWin.isDestroyed()) tempWin.destroy();
                        resolve({ success: true, message: `Connected. Title: ${title}` });
                    }
                });

                tempWin.loadURL('https://cs.rin.ru/forum/ucp.php', { userAgent: USER_AGENT });
            }).catch(e => {
                clearTimeout(safetyTimeout);
                if (!tempWin.isDestroyed()) tempWin.destroy();
                resolve({ success: false, message: `Cookie Set Failed: ${e}` });
            });
        })
    })

    // IGDB Handlers
    ipcMain.handle('get-igdb-credentials', () => {
        return {
            clientId: store.get('igdbClientId', ''),
            clientSecret: store.get('igdbClientSecret', '')
        }
    })

    ipcMain.handle('set-igdb-credentials', (_event, creds) => {
        store.set('igdbClientId', creds.clientId);
        store.set('igdbClientSecret', creds.clientSecret);
        // Clear token to force refresh
        store.delete('igdbAccessToken');
        store.delete('igdbTokenExpiry');
        return true;
    })

    ipcMain.handle('test-igdb', async () => {
        const clientId = store.get('igdbClientId');
        const clientSecret = store.get('igdbClientSecret');

        if (!clientId || !clientSecret) return { success: false, message: 'Missing Credentials' };

        const tokenData = await getIGDBToken(clientId, clientSecret);
        if (!tokenData) return { success: false, message: 'Auth Failed. Check Client ID/Secret.' };

        store.set('igdbAccessToken', tokenData.access_token);
        store.set('igdbTokenExpiry', Date.now() + (tokenData.expires_in * 1000));

        // Try a test search
        const testSearch = await searchIGDB('Hytale', clientId, tokenData.access_token);
        if (testSearch) {
            return { success: true, message: `Success! Found: ${testSearch.name}` };
        } else {
            return { success: true, message: 'Auth Success, but search yielded no results.' };
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
