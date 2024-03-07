const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	allowDM: true,
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		const replyEmbed = new EmbedBuilder()
			.setColor(interaction.client.embedColor)
			.setTitle("Pong!")
			
		await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
	},
};