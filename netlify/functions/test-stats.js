// Temporary test wrapper to invoke daily-stats via HTTP
// Delete this file after testing
const dailyStats = require('./daily-stats.js');

exports.handler = async (event, context) => {
    return dailyStats.handler(event, context);
};
