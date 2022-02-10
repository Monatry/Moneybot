import { Client as TwitchClient } from 'tmi.js'
import { TwitchAPI } from './api';
import axios from 'axios';
import { UserState } from './userstate.interface';
import * as YAML from 'yaml';
import { readFileSync, writeFileSync } from 'fs';
import { Client } from './client';
import { MoneyBot } from './moneybot';
import { MessageData } from './messageData.model';

const commandsFile = readFileSync('assets/commands.yaml', 'utf-8');
const commandTexts: Record<string, Record<string, string[]>> = YAML.parse(commandsFile);

enum AccessLevel {All, Subs, VIP, Mods, Broadcaster};
type CommandInterface = (moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, args: string[], commandName?: string) => Promise<void>;

enum CoinflipResult { Heads = "heads", Tails = "tails" };

export class Commands {
    public readonly commands: Record<string, [string[], AccessLevel, CommandInterface, AccessLevel?]> = {
        unpog: [['banpog'], AccessLevel.Broadcaster, this.Unpog],
        freepog: [['repog', 'freepog'], AccessLevel.Broadcaster, this.Freepog],
        lurk: [[], AccessLevel.All, this.Lurk],
        so: [['shoutout'], AccessLevel.Subs, this.Shoutout],
        coinflip: [['flip', 'coin'], AccessLevel.All, this.Coinflip],
        kanye: [['ye', 'yeezy'], AccessLevel.All, this.Kanye],
        swap: [['switch'], AccessLevel.Subs, this.Swap],
        swapto: [['set'], AccessLevel.Subs, this.SwapTo],
        addcommand: [[], AccessLevel.Mods, this.AddCustom]
    }
    public readonly aliases: Record<string, [AccessLevel, CommandInterface, AccessLevel?]> = {};
    public customCommands: Record<string, Record<string, string>>;

    constructor() {
        for (const commandName in this.commands) {
            const command: [AccessLevel, any] = [this.commands[commandName][1], this.commands[commandName][2]];
            this.aliases[commandName] = command;
            for (const alias of this.commands[commandName][0]) {
                this.aliases[alias] = command;
            }
        }

        this.customCommands = JSON.parse(readFileSync('cache/custom-commands', 'utf8'));
    }

    public async runCommand(moneyBot: MoneyBot, channel: string, userstate: UserState, message: string) {
        let args = message.split(/\s+/).filter(s => s != '');
        const commandName = args[0].toLowerCase();
        args = args.slice(1);

        const botName = moneyBot.currentClient.botName;
        let command = this.aliases[commandName];
        if (!command) {
            if (this.customCommands[channel][commandName]) {
                command = [AccessLevel.All, this.CallCustom, AccessLevel.Mods];
            }
            else {
                return;
            }
        };

        if (!this.authenticate(args.length > 0 && command[2] ? command[2] : command[0], userstate)) {
            return moneyBot.currentClient.client.say(channel, this.randomFromList(commandTexts[botName].denied));
        }

        try {
            await command[1].bind(this)(moneyBot, channel, userstate, botName, args, commandName);
        }
        catch (err) {
            if (err.response) {
                console.error(err.response.data);
            }
            else {
                console.error(err);
            }
        }
    }

    private authenticate(lowestLevel: AccessLevel, tags: UserState): boolean {
        for (let level = lowestLevel; level <= AccessLevel.Broadcaster; level++) {
            switch (level) {
                case AccessLevel.All:
                    return true;
                case AccessLevel.Subs:
                    if (tags.badges.premium == 1) return true;
                    break;
                case AccessLevel.VIP:
                    if (tags.badges.vip == 1) return true;
                    break;
                case AccessLevel.Mods:
                    if (tags.badges.moderator == 1) return true;
                    break;
                case AccessLevel.Broadcaster:
                    if (tags.badges.broadcaster == 1) return true;
                    break;
            }
        }

        return false;
    }

    public async sayRandomThing(client: Client, channel: string, subject: string, botName: string, command: string, customData?: any): Promise<any> {
        const chatList = commandTexts[botName][command];
        if (!chatList) {
            throw new Error(`No message for command "${command}" for bot "${botName}"`)
        }

        let message = this.randomFromList<string>(chatList);
        let messageData: MessageData;
        if (message.includes('{')) {
            messageData = await MessageData.GetMessageData(client.TwitchAPI, subject, true);
        }

        while (message.includes('{')) {
            const variable = message.match(/(?<=\{)(.*?)(?=\})/);
            message = message.replace(/{.*?}/, messageData[variable[0]] ?? customData?.[variable[0]] ?? 'ERROR BEEP BOOP');
        }

        return client.client.say(channel, message);
    }

    private randomFromList<T>(list: T[]): T {
        return list[Math.floor(Math.random() * list.length)];
    }

    private async Unpog(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, _args: string[]) {
        await moneyBot.currentClient.client.say(channel, "/me unpogs your champ");

        const user = await moneyBot.currentClient.TwitchAPI.apiClient.users.getUserByName(channel.replace('#', ''));
        const myUser = await moneyBot.currentClient.TwitchAPI.apiClient.users.getUserByName(botName);

        await moneyBot.currentClient.TwitchAPI.addBlockedTerm('pogchamp', user.id, myUser.id);
        await moneyBot.currentClient.TwitchAPI.addBlockedTerm('poggers', user.id, myUser.id);
        await moneyBot.currentClient.TwitchAPI.addBlockedTerm('pog', user.id, myUser.id);
    }

    private async Freepog(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, _args: string[]) {
        await moneyBot.currentClient.client.say(channel, "/me pogs your champ PogChamp");

        const user = await moneyBot.currentClient.TwitchAPI.apiClient.users.getUserByName(channel.replace('#', ''));
        const myUser = await moneyBot.currentClient.TwitchAPI.apiClient.users.getUserByName(botName);

        await moneyBot.currentClient.TwitchAPI.removeBlockedTerm(['pogchamp', 'poggers', 'pog'], user.id, myUser.id);
    }

    private Lurk(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, _args: string[]) {
        return this.sayRandomThing(moneyBot.currentClient, channel, userstate['display-name'], botName, 'lurk');
    }
    
    private async Shoutout(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, args: string[]) {
        return this.sayRandomThing(moneyBot.currentClient, channel, args[0], botName, 'shoutout');
    }

    private async Coinflip(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, args: string[]) {
        let expectedResult: CoinflipResult;
        switch (args[0].toLowerCase()) {
            case "heads":
                expectedResult = CoinflipResult.Heads;
                break;
            case "tails":
                expectedResult = CoinflipResult.Tails;
                break;
        }
        if (!expectedResult) {
            return moneyBot.currentClient.client.say(channel, `You have to call either heads or tails.`);
        }

        await moneyBot.currentClient.client.say(channel, `Time to flip a coin. Here goes...`);

        await this.Wait(1000);

        const rand = Math.random() * 2;
        const flipRes = Math.floor(rand);

        if (flipRes == 1)
            await moneyBot.currentClient.client.say(channel, `It is... Heads!`)
        else if (flipRes == 0)
            await moneyBot.currentClient.client.say(channel, `It is... Tails!`)
        else
            await moneyBot.currentClient.client.say(channel, `It is... Landed on its side!`)

        await this.Wait(250);
            
        if ((flipRes == 1 && expectedResult == CoinflipResult.Heads) || (flipRes == 0 && expectedResult == CoinflipResult.Tails))
            return this.sayRandomThing(moneyBot.currentClient, channel, userstate['display-name'], botName, 'flipWin');
        else
            return this.sayRandomThing(moneyBot.currentClient, channel, userstate['display-name'], botName, 'flipLose');
    }

    private async Kanye(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, _args: string[]) {
        const quoteRes = await axios.get('https://api.kanye.rest/');

        return this.sayRandomThing(moneyBot.currentClient, channel, userstate['display-name'], botName, 'kanye', {quote: quoteRes.data.quote});
        // return moneyBot.currentClient.client.say(channel, `ringonDorime Yeezy once said: "${quoteRes.data.quote}" ringonDorime`);
    }

    private async CallCustom(moneyBot: MoneyBot, channel: string, _userstate: UserState, _botName: string, args: string[], commandName: string) {
        if (args.length > 0) {
            args.unshift(commandName);
            return this.AddCustom(moneyBot, channel, _userstate, _botName, args, commandName);
        }

        return moneyBot.currentClient.client.say(channel, this.customCommands[channel][commandName]);
    }

    private async AddCustom(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, args: string[], _commandName: string) {
        if (!this.customCommands[channel]) this.customCommands[channel] = {};
        this.customCommands[channel][args[0]] = args.slice(1).join(' ');
        
        writeFileSync('cache/custom-commands', JSON.stringify(this.customCommands));

        return this.sayRandomThing(moneyBot.currentClient, channel, userstate['display-name'], botName, 'customCommand');
    }

    private async Swap(moneyBot: MoneyBot, channel: string, userstate: UserState, _botName: string, args: string[], _commandName: string) {
        // Wait prevents the bot from picking up the message after the change
        await this.Wait(500);

        const newClient = moneyBot.Swap();

        return this.sayRandomThing(newClient, channel, userstate['display-name'], newClient.botName, 'swap');
    }

    private async SwapTo(moneyBot: MoneyBot, channel: string, userstate: UserState, botName: string, args: string[], _commandName: string) {
        // Wait prevents the bot from picking up the message after the change
        await this.Wait(500);

        const newClient = moneyBot.Set(args[0]);
        if (newClient == null) {
            return moneyBot.currentClient.client.say(channel, commandTexts[botName].swapFail)
        }

        return this.sayRandomThing(newClient, channel, userstate['display-name'], newClient.botName, 'swap');
    }

    private Wait(ms: number): Promise<void> {
        return new Promise(res => setTimeout(res, ms));
    }
}