import { Client } from "./client";
import * as YAML from 'yaml';
import { readFileSync } from "fs";

export class MoneyConfig {
    channels: string[];
    name: string;
    oauth: string;
    clientId: string;
    secretId: string;
}

class YamlConfig {
    bots: Record<string, MoneyConfig>;
}

export class MoneyBot {
    public clients: Client[] = [];
    public currentClient: Client;

    private currentClientIndex: number = 0;

    constructor() {
        const botConfig: YamlConfig = YAML.parse(readFileSync('assets/bots.yaml', 'utf8'));

        for(const name in botConfig.bots) {
            const moneyConfig = botConfig.bots[name];
            moneyConfig.name = name;
            
            const client = new Client(name, moneyConfig, this);
            client.runClient().catch(err => console.log(err));
            this.clients.push(client);
        }

        this.currentClient = this.clients[0];
    }

    public Swap(): Client {
        this.currentClientIndex++;
        if (this.currentClientIndex >= this.clients.length) this.currentClientIndex = 0;

        this.currentClient = this.clients[this.currentClientIndex];
        return this.currentClient;
    }

    public Set(name: string): Client {
        const botIndex = this.clients.findIndex(c => c.botName == name);
        if (botIndex < 0) return null;

        this.currentClient = this.clients[botIndex];
        this.currentClientIndex = botIndex;
        return this.currentClient;
    }
}