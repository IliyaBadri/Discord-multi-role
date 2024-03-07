const config = require('../config.json');
const { REST, Routes } = require('discord.js');

async function updateCommandsOnRemote(commands) {
	const restAPI = new REST().setToken(config.token);

    const data = await restAPI.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
    );
}

module.exports = {
    updateCommandsOnRemote
}