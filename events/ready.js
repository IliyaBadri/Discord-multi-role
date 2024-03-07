const { Events } = require('discord.js');
const { consoleMessages } = require('../modules/enums');
module.exports = {
	name: Events.ClientReady,
	async execute(client) {
		console.log(consoleMessages.CLIENT_READY(client.user.tag));
	},
};