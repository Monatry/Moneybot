import { readFileSync } from "fs";
import { Client } from "./client";
import { MoneyBot } from "./moneybot";

const ascii = readFileSync('assets/ascii.txt');
console.log(ascii.toString());

new MoneyBot();