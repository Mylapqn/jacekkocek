import { sheets_v4, sheets } from "@googleapis/sheets";
import { GoogleAuth } from "google-auth-library";

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

export async function getDayScores(): Promise<Map<string, number>> {
    doAuth();
    let output = new Map<string, number>();
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Test!B" + await getTodayIndex() + ":J",
        valueRenderOption: "FORMATTED_VALUE"

    });
    for (const line of result.data.values) {
        output.set(line[0], parseInt(line[8]));
    }
    return output;
}

/*
Map(18) {
    '2.9.' => 0,
    '3.9.' => 0,
    '4.9.' => 0,
    '5.9.' => 83,
    '6.9.' => 83,
    '7.9.' => 83,
    '8.9.' => 83,
    '9.9.' => 83,
    '10.9.' => 83,
    '11.9.' => 83,
    '12.9.' => 62,
    '13.9.' => 62,
    '14.9.' => 62,
    '15.9.' => 62,
    '16.9.' => 62,
    '17.9.' => 62,
    '18.9.' => 62,
    '19.9.' => 63
  }
*/

//tsc src/sheets.ts && node src/sheets.js && del "src\\sheets.js"