import { Client as TwitchClient } from 'tmi.js'
import { TwitchAPI } from './api';
import { Commands } from './commands';
import { MoneyBot, MoneyConfig } from './moneybot';
import { UserState } from './userstate.interface';

export class Client {
    public botName: string;
    public readonly client: TwitchClient;
    public readonly TwitchAPI: TwitchAPI;
    public readonly commands: Commands = new Commands();
    public readonly moneyBot: MoneyBot;

    constructor(botName: string, config: MoneyConfig, moneyBot: MoneyBot) {
        this.moneyBot = moneyBot;
        this.botName = botName;
        this.client = new TwitchClient({
            options: { debug: false },
            identity: {
                username: config.name,
                password: config.oauth,
            },
            channels: config.channels
        });

        this.TwitchAPI = new TwitchAPI(botName, config.clientId, config.secretId);
    }

    async runClient() {
        await this.client.connect();

        this.client.on('message', (channel: string, userstate: any, message: string, self) => {
            if (self) return;
            if (this.moneyBot.currentClient != this && !message.startsWith('@')) return;

            if (message.startsWith('!')) {
                message = message.replace('!', '');
            }
            else if (!message.toLowerCase().startsWith(`@${this.botName}`)){
                message = message.replace(`@${this.botName} `, '');
            }
            else {
                return;
            }

            console.log(`${this.botName}: ${message}`);
            
            this.commands.runCommand(this.moneyBot, channel, userstate, message);
        });

        this.client.on('resub', (channel: string, username, streakMonths, message: any, userstate: UserState, ) => {
            console.log(`[${new Date().toLocaleDateString()}][resub] ${userstate['display-name']} ${message}`)
        });

        this.client.on('subscription', (channel: string, username, method, message: any, userstate: UserState, ) => {
            console.log(`[${new Date().toLocaleDateString()}][subscription] ${method} ${message}`)
        });

        this.client.on('subgift', (channel: string, username: string, streakMonths: number, recipient: string, methods, userstate: UserState) => {
            console.log(`[${new Date().toLocaleDateString()}][subgift] ${methods}`)
        });

        this.client.on('submysterygift', (channel: string, username: string, numbOfSubs: number, methods, userstate: UserState) => {
            console.log(`[${new Date().toLocaleDateString()}][submysterygift] ${numbOfSubs} ${methods}`)
        });

        this.client.on('raided', (channel: string, username: string, viewers: number) => {
            if (this.moneyBot.currentClient != this) return;
            this.commands.sayRandomThing(this, channel, username, this.botName, 'raid', { viewers: viewers })
        });
    }
}