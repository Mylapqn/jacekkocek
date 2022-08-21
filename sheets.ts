import { google, sheets_v4 } from "googleapis";

let auth;
let client;
let googleSheets: sheets_v4.Sheets;
const spreadsheetId = "1ErCX6oRJjDnEE_jJvFbhFAekOQieHo6kuoPqwfdiPoA";


function doAuth() {
    auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
    client = auth.getClient();
    googleSheets = google.sheets({ version: "v4", auth: client });
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
    }) + 5;
    return todayIndex;
}

async function getDayScores(){
    let output = new Map<string,number>();
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Test!B"+await getTodayIndex()+":J",
        valueRenderOption: "FORMATTED_VALUE"

    });
    for (const line of result.data.values) {
        output.set(line[0], parseInt(line[8]));
    }
    return output;
}

doAuth();
console.log("---------");

getDayScores().then(console.log);

//tsc sheets.ts && node sheets.js && del sheets.js