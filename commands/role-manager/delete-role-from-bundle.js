const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { embedErrorMessages } = require('../../modules/enums');

module.exports = {
    allowDM: false,
    data: new SlashCommandBuilder()
        .setName('delete-role-from-bundle')
        .setDescription('Deletes a role from a role bundle.'),
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

        for(const databaseRoleBundle of databaseRoleBundles){
            const roleBundleOption = new StringSelectMenuOptionBuilder()
                .setLabel(`#${databaseRoleBundle.token}`)
                .setValue(Buffer.from(databaseRoleBundle.token).toString('base64'))
                .setDescription(`Lets you delete a role from the #${databaseRoleBundle.token} role bundle.`);

            roleBundleOptions.push(roleBundleOption);
        }

        const roleBundleSelectorMenu = new StringSelectMenuBuilder()
            .setCustomId('select-role-bundle')
            .addOptions(roleBundleOptions);

        const roleBundleSelectorActionRow = new ActionRowBuilder()
            .addComponents(roleBundleSelectorMenu);

        const firstReplyEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Select a role bundle to delete a role from:");

        const response = await interaction.editReply({ embeds: [firstReplyEmbed], components: [roleBundleSelectorActionRow] });

        const responseCollector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

        let selectedRoleBundleToken = null;

        responseCollector.on('collect', async responseInteraction => {
            if(responseInteraction.customId == 'select-role-bundle'){

                await responseInteraction.deferUpdate();
                await interaction.editReply({ components: [] });

                const roleBundleSelectionBase64 = responseInteraction.values[0];
                selectedRoleBundleToken = Buffer.from(roleBundleSelectionBase64, 'base64').toString('ascii');

                const selectQuery = 'SELECT id, identifier, token FROM roles WHERE token = ?';
                const selectValues = [selectedRoleBundleToken];
                const databaseRoles = await interaction.client.databaseManager.getSQLSelectorPromise(selectQuery, selectValues);

                if(databaseRoles.length < 1) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(interaction.client.embedColor)
                        .setTitle(`Error`)
                        .setDescription(embedErrorMessages.NO_ROLE_IN_BUNDLE);
        
                    await interaction.editReply({ embeds: [errorEmbed] });
                    return;
                }

                let allGuilds = [];

                for(const guildMap of interaction.client.guilds.cache){
                    allGuilds.push(guildMap[1]);
                }

                let roleOptions = [];

                for(const databaseRole of databaseRoles){
                    let roleTitle = `@UNKNOWN ROLE - ${databaseRole.identifier} - UNKNOWN SERVER`;
                    let roleExists = false;
                    let role = null;
                    for(guild of allGuilds){
                        const roleExistsInGuild = await guild.roles.cache.has(databaseRole.identifier);

                        if(!roleExistsInGuild) continue;

                        roleExists = true;

                        role = await guild.roles.fetch(databaseRole.identifier);
                        break;
                    }

                    

                    if(roleExists) {
                        roleTitle = `@${role.name} - ${databaseRole.identifier} - ${role.guild.name}`;
                    }

                    const roleOption = new StringSelectMenuOptionBuilder()
                        .setLabel(roleTitle)
                        .setValue(Buffer.from(databaseRole.identifier).toString('base64'))
                        .setDescription(`Deletes the ${roleTitle}`);

                    roleOptions.push(roleOption);
                }

                const roleSelectorMenu = new StringSelectMenuBuilder()
                    .setCustomId('select-role')
                    .addOptions(roleOptions);

                const roleSelectorActionRow = new ActionRowBuilder()
                    .addComponents(roleSelectorMenu);

                const secondReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Select a role to delete from the role bundle:");

                await interaction.editReply({ embeds: [secondReplyEmbed], components: [roleSelectorActionRow] });
            } else if(responseInteraction.customId == 'select-role'){
                await responseInteraction.deferUpdate();
                await interaction.editReply({ components: [] });

                const roleSelectionBase64 = responseInteraction.values[0];
                const selectedRoleIdentifier = Buffer.from(roleSelectionBase64, 'base64').toString('ascii');

                const deleteQuery = 'DELETE FROM roles WHERE identifier = ? AND token = ?';

                await interaction.client.databaseManager.getSQLStatementPromise(deleteQuery, selectedRoleIdentifier, selectedRoleBundleToken);

                const finalReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Successfully deleted the role from the role bundle.")
                    .setDescription(`**Role bundle token:**\n\`\`\`${selectedRoleBundleToken}\`\`\`\n\n**ID:**\n\`\`\`${selectedRoleIdentifier}\`\`\``);
                            
                await interaction.editReply({ embeds: [finalReplyEmbed] });

                responseCollector.stop(`Interaction complete`);
            }
        });

        
    },
};