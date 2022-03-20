export function dateString(inputDate) {
    var minutes = inputDate.getMinutes();
    var hours = inputDate.getHours();
    var day = inputDate.getDate();
    var month = inputDate.getMonth() + 1;
    var year = inputDate.getFullYear();
    return (day + "." + month + "." + year + " " + hours + ":" + addZero(minutes));
}

export function getTimeOffset(date, timeZone) {
    const tz = date.toLocaleString("en", { timeZone, timeStyle: "long" }).split(" ").slice(-1)[0];
    const dateString = date.toString();
    let offset = Date.parse(`${dateString} ${tz}`) - Date.parse(`${dateString} UTC`);
    return offset;
}

export function toTitleCase(phrase) {
    return phrase
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export function randomInt(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

export function timeString(seconds) {
    let output;
    if (seconds >= 3600) {
        output = Math.floor(seconds / 3600) + ":" + addZero(Math.floor((seconds % 3600) / 60)) + ":" + addZero(seconds % 60);
    }
    else {
        output = Math.floor(seconds / 60) + ":" + addZero(seconds % 60);
    }
    return output;
}

export function addZero(x) {
    return String(x).padStart(2, "0");
}