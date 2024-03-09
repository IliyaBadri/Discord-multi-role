const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { embedErrorMessages } = require('../../modules/enums');
const crypto = require('crypto');

module.exports = {
    allowDM: false,
    data: new SlashCommandBuilder()
        .setName('create-role-bundle')
        .setDescription('Creates a role bundle.'),
    async execute(interaction) {
        const loadingEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Loading . . .")
        
        await interaction.reply({ embeds: [loadingEmbed] , ephemeral: true });

        const interactionMember = interaction.member;

        let token = "";

        async function createAndCheckToken(){
            token = await crypto.randomBytes(16).toString('hex');
            const selectQuery = 'SELECT id, owner, token FROM role_bundles WHERE token = ?';
            const selectValues = [token];
            const databaseExistingTokens = await interaction.client.databaseManager.getSQLSelectorPromise(selectQuery, selectValues);
    
            if(databaseExistingTokens.length > 0) await createAndCheckToken();
        }

        await createAndCheckToken();

        const statementQuery = 'INSERT INTO role_bundles (owner, token) VALUES (?, ?)';

        await interaction.client.databaseManager.getSQLStatementPromise(statementQuery, interactionMember.id.toString(), token);

        const replyEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Successfully created a role bundle.")
            .setDescription(`**Role bundle token:**\n\`\`\`${token}\`\`\``);
                    
        await interaction.editReply({ embeds: [replyEmbed] });
    },
};