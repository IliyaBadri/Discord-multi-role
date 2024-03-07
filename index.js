const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const databaseManager = require('./modules/databaseManager');
const {consoleMessages} = require('./modules/enums');
const commandManager = require('./modules/commandManager');
const styleManager = require('./modules/styleManager');

main();

async function main() {

	console.log(consoleMessages.LOADING_DATABASE);

	await databaseManager.setup();

	console.log(consoleMessages.LOADING_CLIENT);

	const client = new Client({ intents: [GatewayIntentBits.Guilds] });

	client.databaseManager = databaseManager;
	client.embedColor = await styleManager.getEmbedColor(databaseManager);

	const eventsFolderPath = path.join(__dirname, config.eventsFolder);
	const eventFiles = fs.readdirSync(eventsFolderPath).filter(file => file.endsWith('.js'));

	console.log(consoleMessages.LOADING_EVENTS(eventFiles.length));

	for (const eventFile of eventFiles) {
		const eventFilePath = path.join(eventsFolderPath, eventFile);
		const event = require(eventFilePath);
		if ('name' in event && 'execute' in event) {

			console.log(consoleMessages.LOADING_EVENT(event.name));

			if(event.once){
				client.once(event.name, async (...args) => {
					event.execute(...args)
				})
			} else {
				client.on(event.name, async (...args) => {
					event.execute(...args)
				})
			}
			
		} else {
			console.log(consoleMessages.EVENT_MISSING_PROPERTIES(eventFilePath));
		}
	}


	client.commands = new Collection();
	let commandDatas = [];

	const commandFoldersPath = path.join(__dirname, config.commandsFolder);
	const commandFolders = fs.readdirSync(commandFoldersPath);
	for (const commandFolder of commandFolders) {
		const commandsPath = path.join(commandFoldersPath, commandFolder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		for (const commandFile of commandFiles) {
			const commandFilePath = path.join(commandsPath, commandFile);
			const command = require(commandFilePath);
			if ('data' in command && 'execute' in command && 'allowDM' in command) {
				console.log(consoleMessages.LOADING_COMMAND(command.data.name));
				client.commands.set(command.data.name, command);
				commandDatas.push(command.data.toJSON());
			} else {
				console.log(consoleMessages.COMMAND_MISSING_PROPERTIES(commandFilePath));
			}
		}
	}

	console.log(consoleMessages.SYNCING_COMMANDS(commandDatas.length));
	
	commandManager.updateCommandsOnRemote(commandDatas);

	client.login(config.token);
}

