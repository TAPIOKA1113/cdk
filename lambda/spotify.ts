import { USERNAME, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } from '../env';
import fetch from 'node-fetch';

const username = USERNAME;
const clientId = CLIENT_ID;
const clientSecret = CLIENT_SECRET;
let accessToken = '';

const authEncoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
const authHeaders = {
    'Authorization': `Basic ${authEncoded}`,
    'Content-Type': 'application/x-www-form-urlencoded'
};
const authData = new URLSearchParams({
    'grant_type': 'refresh_token',
    'refresh_token': REFRESH_TOKEN
});

async function refreshToken() {
    const authUrl = 'https://accounts.spotify.com/api/token';
    const response = await fetch(authUrl, {
        method: 'POST',
        headers: authHeaders,
        body: authData
    });
    const data: any = await response.json();
    return accessToken = data.access_token;
}

export async function createSetlist(setlist: any) {
    try {
        await refreshToken();

        const datePart = setlist.event_date.toISOString().split('T')[0];
        const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${username}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${setlist.artist_name} ${setlist.tour_name} (${datePart})`,
                public: true
            })
        });
        const playlist: any = await playlistResponse.json();

        for (const song of setlist.songs) {
            const trackId = await spSearchSong(song.name, song.original_artist);
            await spAddPlaylist(playlist.id, trackId);
        }

        console.log(`Playlist created: https://open.spotify.com/playlist/${playlist.id}`);
        return playlist.id;

    } catch (error) {
        console.error('Error submitting setlist:', error);
    }
}

async function spSearchSong(name: string, artist: string): Promise<string> {
    const en_q = encodeURIComponent(`${name} ${artist}`);
    const q = decodeURIComponent(en_q);
    console.log(`Searching for: ${q}`);
    const response = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=10&market=JP`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data: any = await response.json();
    return data.tracks.items[0].id;
}

async function spAddPlaylist(playlistId: string, trackId: string): Promise<void> {
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uris: [`spotify:track:${trackId}`]
        })
    });
}

export async function spGetPlaylist(playlistId: string) {
    await refreshToken();
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    return await response.json();
    // return accessToken;  APIにアクセスするたびに違うトークンが返ってきているのでここは問題ない
}

export async function spModSearchSong(name: string, artist: string): Promise<any> {
    await refreshToken();
    const en_q = encodeURIComponent(`${name} ${artist}`);
    const q = decodeURIComponent(en_q);
    console.log(`Searching for: ${q}`);
    const response = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=10&market=JP`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    return await response.json();
}

export async function spReCreatePlaylist(id: string, songIds: string[]) {
    await refreshToken();
    const getPlaylistResponse = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const getPlaylist: any = await getPlaylistResponse.json();
    const name = getPlaylist.name;

    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${username}/playlists`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            public: true
        })
    });
    const playlist: any = await createPlaylistResponse.json();

    for (const songId of songIds) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [`spotify:track:${songId}`]
            })
        });
    }

    console.log(playlist.id);
    return playlist.id;
}