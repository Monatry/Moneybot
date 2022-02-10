export interface UserState {
    'badge-info': { founder: number };
    badges: { moderator: number, founder: number, premium: number, subscriber: number, vip: number, broadcaster: number };
    'client-nonce': string;
    color: string;
    'display-name': string;
    emotes: null;
    'first-msg': boolean;
    flags: null;
    id: string;
    mod: boolean;
    'room-id': number;
    subscriber: boolean;
    'tmi-sent-ts': number;
    turbo: boolean;
    'user-id': number;
    'user-type': 'mod';
    'emotes-raw': null;
    'badge-info-raw': 'founder/9';
    'badges-raw': 'moderator/1;founder/0;premium/1';
    username: string;
    'message-type': 'chat';
}