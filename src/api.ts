import { ClientCredentialsAuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { readFileSync, writeFileSync } from 'fs';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

class CacheModel {
    accessToken: string;
    refreshToken: string;
}

export class TwitchAPI {
    public botName: string;
    public apiClient: ApiClient;
    public accessToken: string;
    public refreshToken: string;

    constructor(botName: string, clientId: string, secretId: string) {
        const authProvider = new ClientCredentialsAuthProvider(clientId, secretId);
        this.apiClient = new ApiClient({ authProvider });
        
        this.botName = botName;
        const cache: CacheModel = JSON.parse(readFileSync(`cache/api-${botName}.json`, 'utf8'));
        console.log(botName);
        console.log(cache);

        this.accessToken = cache.accessToken;
        this.refreshToken = cache.refreshToken;
    }

    public async authenticate() {
        const res = await axios.post(`https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${this.refreshToken}&client_id=${process.env.APP_CLIENT_ID}&client_secret=${process.env.APP_SECRET_ID}`);
        const data = res.data;

        this.refreshToken = data.refresh_token;
        this.accessToken = data.access_token;

        const cache: CacheModel = {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken
        };

        writeFileSync(`cache/api-${this.botName}.json`, JSON.stringify(cache))
    }

    public async sendRequest(method: string, url: string, body: any = null, retry = true): Promise<AxiosResponse> {
        const options = {
            headers: {
                Authorization: 'Bearer ' + this.accessToken,
                'Client-Id': (await this.apiClient.getTokenInfo()).clientId
            }
        };

        try {
            switch(method) {
                case "get":
                    return await axios.get("https://api.twitch.tv/helix/" + url, options);
                case "post":
                    return await axios.post("https://api.twitch.tv/helix/" + url, body, options);
                case "delete":
                    return await axios.delete("https://api.twitch.tv/helix/" + url, options);
            }
        }
        catch (err) {
            if (err.response?.data?.message == 'Invalid OAuth token' && retry) {
                await this.authenticate();

                return this.sendRequest(method, url, body, false);
            }

            throw err;
        }
    }

    public async addBlockedTerm(term: string, channelId: string, moderatorId: string) {
        const url = `moderation/blocked_terms?broadcaster_id=${channelId}&moderator_id=${moderatorId}`;
        return await this.sendRequest('post', url, {
            text: term
        });
    }

    public async removeBlockedTerm(terms: string[], channelId: string, moderatorId: string) {
        const res = await this.sendRequest('get', `moderation/blocked_terms?broadcaster_id=${channelId}&moderator_id=${moderatorId}`);
        for (const term of terms) {
            const termId = res.data.data.find(t => t.text == term)?.id;
            if (!termId) continue;
            
            const url = `moderation/blocked_terms?broadcaster_id=${channelId}&moderator_id=${moderatorId}&id=${termId}`;
            await this.sendRequest('delete', url)
        }
    }
}