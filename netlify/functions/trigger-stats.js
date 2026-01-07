// Temporary trigger for testing daily stats email
const dailyStats = require('./daily-stats.js');

exports.handler = async (event, context) => {
    return dailyStats.handler(event, context);
};
