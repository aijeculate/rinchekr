import { net } from 'electron';

interface IGDBToken {
    access_token: string;
    expires_in: number;
    token_type: string;
}

export const getIGDBToken = (clientId: string, clientSecret: string): Promise<IGDBToken | null> => {
    return new Promise((resolve) => {
        const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
        const request = net.request({ method: 'POST', url });

        request.on('response', (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk.toString());
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.access_token) {
                        resolve(json);
                    } else {
                        console.error('IGDB Token Error:', json);
                        resolve(null);
                    }
                } catch (e) {
                    console.error('IGDB Token Parse Error', e);
                    resolve(null);
                }
            });
        });
        request.on('error', (e) => {
            console.error('IGDB Token Request Error', e);
            resolve(null);
        });
        request.end();
    });
};

export const searchIGDB = (query: string, clientId: string, accessToken: string): Promise<{ name: string, cover?: string, summary?: string, genres?: string[] } | null> => {
    return new Promise((resolve) => {
        const request = net.request({
            method: 'POST',
            url: 'https://api.igdb.com/v4/games',
            // @ts-ignore
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'text/plain'
            }
        });

        // Query: Search by name, get name, cover url, summary, genres (name). Limit 1.
        // Needs a robust query.
        const body = `fields name, cover.url, summary, genres.name; search "${query.replace(/"/g, '')}"; limit 1;`;

        request.write(body);

        request.on('response', (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk.toString());
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (Array.isArray(json) && json.length > 0) {
                        const game = json[0];
                        resolve({
                            name: game.name,
                            // IGDB returns //images.igdb.com/..., need to prepend https: and often resize
                            // cover.url usually: //images.igdb.com/igdb/image/upload/t_thumb/clouderror.jpg
                            // We want t_cover_big or t_1080p for better quality.
                            cover: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : undefined,
                            summary: game.summary,
                            genres: game.genres ? game.genres.map((g: any) => g.name) : []
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    console.error('IGDB Search Parse Error', e);
                    resolve(null);
                }
            });
        });
        request.on('error', () => resolve(null));
        request.end();
    });
};
