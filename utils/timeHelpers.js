// Helper functions to check time periods
function isSameDay(d1, d2) {
    const offset = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    const adjustedD1 = new Date(d1.getTime() - offset);
    const adjustedD2 = new Date(d2.getTime() - offset);
    return adjustedD1.getFullYear() === adjustedD2.getFullYear() &&
           adjustedD1.getMonth() === adjustedD2.getMonth() &&
           adjustedD1.getDate() === adjustedD2.getDate();
}

function isSameMonth(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth();
}

function getWeekNumber(d) {
    const date = new Date(d.getTime());
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
}

function isSameWeek(d1, d2) {
    // If they are far apart in time, definitely not same week
    if (Math.abs(d1 - d2) > 10 * 86400000) return false;
    return getWeekNumber(d1) === getWeekNumber(d2) && d1.getFullYear() === d2.getFullYear();
}

module.exports = {
    isSameDay,
    isSameMonth,
    isSameWeek
};
