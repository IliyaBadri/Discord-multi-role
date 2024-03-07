const consoleMessages = {
    LOADING_DATABASE: "[INFO] Loading database . . .",
    LOADING_CLIENT: "[INFO] Loading Discord API client",
    LOADING_EVENTS: (eventCount) => {
        return (`[INFO] Loading ${eventCount} event file(s)`);
    },
    LOADING_EVENT: (eventName) => {
        return (`[INFO] Loading event handler for ${eventName} event.`);
    },
    LOADING_COMMAND: (commandName) => {
        return (`[INFO] Loading command handler for /${commandName}.`);
    },
    SYNCING_COMMANDS: (commandCount) => {
        return (`[INFO] Syncing ${commandCount} command(s) with Discord API`);
    },
    COMMAND_MISSING_PROPERTIES: (commandPath) => {
        return (`[WARN] A command file is missing (data) or (execute) or (allowDM) property at ${commandPath}.`);
    }, 
    EVENT_MISSING_PROPERTIES: (eventPath) => {
        return (`[WARN] An event file is missing (data) or (execute) property at ${eventPath}.`);
    },
    CLIENT_READY: (clientName) =>{
        return (`[INFO] Successfully conncected to Discord API as ${clientName}`);
    }
}

const embedErrorMessages = {
    NO_DM_COMMAND: "You need to use this command in a guild.",
    EXECUTION_ERROR: "There was an error executing this command.",
    UNAUTHORIZED_ADMINISTRATOR: "You don't have ADMINISTRATOR permissions to use this command.",
    NO_ROLE_BUNDLES: "You don't have any role bundles.",
    NO_ACCESS_TO_ANY_ROLES: "You don't have access to any roles.",
    ROLE_ALREADY_IN_BUNDLE: "This role already exists in your bundle.",
    NO_ROLE_IN_BUNDLE: "There isn't any role in this role bundle."
}

module.exports = {
    consoleMessages,
    embedErrorMessages
}