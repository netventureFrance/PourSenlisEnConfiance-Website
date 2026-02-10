// Temporary test wrapper to invoke daily-stats via HTTP
const dailyStats = require('./daily-stats.js');
exports.handler = async (event, context) => dailyStats.handler(event, context);
