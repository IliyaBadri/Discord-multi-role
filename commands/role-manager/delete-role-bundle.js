const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { embedErrorMessages } = require('../../modules/enums');

module.exports = {
    allowDM: false,
    data: new SlashCommandBuilder()
        .setName('delete-role-bundle')
        .setDescription('Deletes a role bundle.'),
    async execute(interaction) {

        const loadingEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Loading . . .")
        
        await interaction.reply({ embeds: [loadingEmbed] , ephemeral: true });

        const interactionMember = interaction.member;

        const selectQuery = 'SELECT id, owner, token FROM role_bundles WHERE owner = ?';
        const selectValues = [interactionMember.id.toString()];
        const databaseRoleBundles = await interaction.client.databaseManager.getSQLSelectorPromise(selectQuery, selectValues);

        if(databaseRoleBundles.length < 1) {
            const errorEmbed = new EmbedBuilder()
                .setColor(interaction.client.embedColor)
                .setTitle(`Error`)
                .setDescription(embedErrorMessages.NO_ROLE_BUNDLES);

            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }

        let roleBundleOptions = [];

        await databaseRoleBundles.forEach(databaseRoleBundle => {
            const roleBundleOption = new StringSelectMenuOptionBuilder()
                .setLabel(`#${databaseRoleBundle.token}`)
                .setValue(Buffer.from(databaseRoleBundle.token).toString('base64'))
                .setDescription(`Selects the role bundle #${databaseRoleBundle.token} to delete.`);

            roleBundleOptions.push(roleBundleOption);
        });

        const roleBundleSelectorMenu = new StringSelectMenuBuilder()
            .setCustomId('select-role-bundle')
            .addOptions(roleBundleOptions);

        const roleBundleSelectorActionRow = new ActionRowBuilder()
            .addComponents(roleBundleSelectorMenu);

        const firstReplyEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Select a role bundle to configure");
                    

        const response = await interaction.editReply({ embeds: [firstReplyEmbed], components: [roleBundleSelectorActionRow] });

        const responseCollector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

        responseCollector.on('collect', async responseInteraction => {
            if(responseInteraction.customId == 'select-role-bundle'){
                await interaction.editReply({ embeds: [loadingEmbed], components: [] });

                const roleBundleSelectionBase64 = responseInteraction.values[0];
                selectedRoleBundleTokentoDelete = Buffer.from(roleBundleSelectionBase64, 'base64').toString('ascii');

                const deleteQuery = 'DELETE FROM role_bundles WHERE token = ?';

                await interaction.client.databaseManager.getSQLStatementPromise(deleteQuery, selectedRoleBundleTokentoDelete);

                const roleDeleteQuery = 'DELETE FROM roles WHERE token = ?';

                await interaction.client.databaseManager.getSQLStatementPromise(roleDeleteQuery, selectedRoleBundleTokentoDelete);

                const replyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Successfully deleted a role bundle.")
                    .setDescription(`Role bundle token: ${selectedRoleBundleTokentoDelete}`);
                            
                await interaction.editReply({ embeds: [replyEmbed] });

                await responseInteraction.deferUpdate();

                responseCollector.stop(`Interaction complete`);
            }
        });

        
    },
};