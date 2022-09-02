import { sheets_v4, sheets } from "@googleapis/sheets";
import { GoogleAuth } from "google-auth-library";
import * as Utilities from "./utilities";

let auth;
let client;
let googleSheets: sheets_v4.Sheets;
const spreadsheetId = "1ErCX6oRJjDnEE_jJvFbhFAekOQieHo6kuoPqwfdiPoA";


function doAuth() {
    auth = new GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
    client = auth.getClient();
    googleSheets = sheets({ version: "v4", auth: client });
}

async function getDayIndex(date = new Date()) {
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Test!B5:B",
        valueRenderOption: "FORMATTED_VALUE"

    });
    let today = (date.getDate() + 1) + "." + (date.getMonth() + 1) + ".";
    let todayIndex = result.data.values.findIndex((value: string[], index, values) => {
        if (value[0] == today) return true;
        return false;
    }) + 4;
    return todayIndex;
}

export async function getDaysScores(): Promise<Map<Date, number>> {
    doAuth();
    let output = new Map<Date, number>();
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Test!B" + await getDayIndex() + ":J",
        valueRenderOption: "FORMATTED_VALUE"

    });
    for (const line of result.data.values) {
        output.set(Utilities.dateFromKinoString(line[0]), parseInt(line[8]));
    }
    return output;
}

export async function getDay(date: Date): Promise<number> {
    doAuth();
    let index = await getDayIndex(date);
    let score = 0;
    try {
        let result = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "Test!J" +  index,
            valueRenderOption: "FORMATTED_VALUE"
    
        });
        score = result.data.values[0][0];
    } catch (error) {
        return undefined;
    }

    return score;
}

//tsc src/sheets.ts && node src/sheets.js && del "src\\sheets.js"