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

async function getTodayIndex() {
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Test!B5:B",
        valueRenderOption: "FORMATTED_VALUE"

    });
    let date = new Date();
    let today = (date.getUTCDate() + 1) + "." + (date.getUTCMonth() + 1) + ".";
    let todayIndex = result.data.values.findIndex((value: string[], index, values) => {
        if (value[0] == today) return true;
        return false;
    }) + 4;
    return todayIndex;
}

export async function getDayScores(): Promise<Map<Date, number>> {
    doAuth();
    let output = new Map<Date, number>();
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Test!B" + await getTodayIndex() + ":J",
        valueRenderOption: "FORMATTED_VALUE"

    });
    for (const line of result.data.values) {
        output.set(Utilities.dayFromKinoString(line[0]), parseInt(line[8]));
    }
    return output;
}

//tsc src/sheets.ts && node src/sheets.js && del "src\\sheets.js"