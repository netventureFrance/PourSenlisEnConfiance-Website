const dailyStats = require('./daily-stats.js');
exports.handler = async (event, context) => dailyStats.handler(event, context);
