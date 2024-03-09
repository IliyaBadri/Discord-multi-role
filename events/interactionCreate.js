const { Events, EmbedBuilder } = require('discord.js');
const { embedErrorMessages } = require('../modules/enums');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) return;

            if(!interaction.inGuild() && !command.allowDM) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle('Error')
                    .setDescription(embedErrorMessages.NO_DM_COMMAND)

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }
    
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);

                const errorEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle('Error')
                    .setDescription(embedErrorMessages.EXECUTION_ERROR)
                try{
                    if (interaction.replied || interaction.deferred) {
                    
                        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }
                } catch {

                }
                
                
            } 
        } 
	},
};