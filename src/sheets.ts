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
        range: "Díly!B6:B",
        valueRenderOption: "UNFORMATTED_VALUE",
    });
    let today = Math.floor(date.getTime() / (24 * 60 * 60 * 1000) + 25569);
    let todayIndex =
        result.data.values.findIndex((value: string[], index, values) => {
            if (value[0] == today.toFixed()) return true;
            return false;
        }) + 6;
    if (todayIndex == 4) throw new Error("~~Offset~~ date is outside the bounds of the ~~dataview~~ sheet");
    return todayIndex;
}

export async function getDaysScores(): Promise<Map<Date, number>> {
    doAuth();
    let output = new Map<Date, number>();
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Díly!B" + (await getDayIndex()) + ":J",
        valueRenderOption: "FORMATTED_VALUE",
    });
    for (const line of result.data.values) {
        output.set(Utilities.dateFromKinoString(line[0]), parseInt(line[8]));
    }
    return output;
}
export type UserKinoData = { weight: number; reliability: number };
export async function getUserData(): Promise<Map<string, UserKinoData>> {
    doAuth();
    try {
        let result = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "Díly!C2:I5",
            valueRenderOption: "FORMATTED_VALUE",
        });
        let userData = new Map<string, UserKinoData>();
        for (let index = 0; index < result.data.values[0].length; index++) {
            const user = result.data.values[0][index];
            const weight = parseFloat(result.data.values[1][index]);
            const reliability = parseFloat(result.data.values[2][index]);
            userData.set(user, { weight, reliability });
        }
        return userData;
    } catch (error) {
        console.error(error);

        return undefined;
    }
}

export async function setUserData(userData: Map<string, UserKinoData>) {
    doAuth();
    let result = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Díly!C2:I2",
        valueRenderOption: "FORMATTED_VALUE",
    });
    let users = result.data.values[0].map((id) => id);
    const orderedData = users.map((u) => [userData.get(u).weight, userData.get(u).reliability]);

    try {
        let result = await googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            range: "Díly!C3:I4",
            valueInputOption: "RAW",
            requestBody: {
                majorDimension: "COLUMNS",
                range: "Díly!C3:I4",
                values: orderedData,
            },
        });
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function setKinoToday(film: string) {
    doAuth();
    let index = await getDayIndex(new Date());
    try {
        let result = await googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            range: "Díly!K" + index,
            valueInputOption: "RAW",
            requestBody: {
                majorDimension: "COLUMNS",
                range: "Díly!K" + index,
                values: [[film]],
            },
        });
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function getDay(date: Date): Promise<number> {
    doAuth();
    let index = await getDayIndex(date);
    let score = 0;
    try {
        let result = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "Díly!J" + index,
            valueRenderOption: "FORMATTED_VALUE",
        });

        score = result.data.values[0][0];
    } catch (error) {
        return undefined;
    }

    return score;
}

//tsc src/sheets.ts && node src/sheets.js && del "src\\sheets.js"
