const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});

const client = auth.getClient();

const googleSheets = google.sheets({ version: "v4", auth: client });
const spreadsheetId = "1knPPBADc_PqOcOROhYTFSDLVDKVWVqXwb3Z4kOqeIHU";
let data = googleSheets.spreadsheets.values.append({
    auth,
    spreadsheetId,
    range: "A!A:A",
    valueInputOption: "USER_ENTERED",
    resource: {
        values: [["lole 2.0"]],
    },
});

