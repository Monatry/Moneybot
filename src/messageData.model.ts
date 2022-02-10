import { TwitchAPI } from "./api";

export class MessageData {
    displayName: string;
    gameName: string;

    public static async GetMessageData(twitchApi: TwitchAPI, username: string, getGameData: boolean): Promise<MessageData> {
        // const userPromise = twitchApi.apiClient.users.getUserByName(username);
        const streamPromise = getGameData ? twitchApi.apiClient.streams.getStreamByUserName(username) : null;

        // const user = await userPromise;
        const stream = await streamPromise;

        return {
            displayName: username,
            gameName: stream?.gameName
        };
    }
}