const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { embedErrorMessages } = require('../../modules/enums');
module.exports = {
    allowDM: false,
    data: new SlashCommandBuilder()
        .setName('configure-role-bundle')
        .setDescription('Configures a role bundle.'),
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
                .setDescription(`Selects the role bundle #${databaseRoleBundle.token}`);

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

        let selectedRoleBundleToken = null;
        let operationType = null;
        let selectedRoleIDtoAdd = null;
        let selectedRoleIDtoDelete = null;

        responseCollector.on('collect', async responseInteraction => {
            if(responseInteraction.customId == 'select-role-bundle') {
                await interaction.editReply({ embeds: [loadingEmbed], components: [] });

                const roleBundleSelectionBase64 = responseInteraction.values[0];
                selectedRoleBundleToken = Buffer.from(roleBundleSelectionBase64, 'base64').toString('ascii');

                const operationTypeSelectorMenu = new StringSelectMenuBuilder()
                    .setCustomId('select-operation-type')
                    .addOptions([
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`Add role`)
                            .setValue(`add`)
                            .setDescription(`By choosing this you will be able to add a role to the role bundle.`),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`Delete role`)
                            .setValue(`delete`)
                            .setDescription(`By choosing this you will be able to delete a role from the role bundle.`)
                    ]);
                
                const operationTypeSelectorActionRow = new ActionRowBuilder()
                    .addComponents(operationTypeSelectorMenu);
    
                const secondReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Select an operation to be done on the role bundle.")
                            
                await interaction.editReply({ embeds: [secondReplyEmbed], components: [operationTypeSelectorActionRow] });

                await responseInteraction.deferUpdate();

            } else if(responseInteraction.customId == 'select-operation-type'){

                await interaction.editReply({ embeds: [loadingEmbed], components: [] });

                operationType = responseInteraction.values[0];

                if(operationType == 'add'){

                    let roleOptionsList = [];

                    await interaction.client.guilds.cache.forEach(async guild => {
                        const guildMember = await guild.members.fetch(interactionMember.id);

                        if(!guildMember) return;

                        if(!guildMember.permissions.has(PermissionsBitField.Flags.Administrator)) return;

                        await guild.roles.cache.forEach(guildRole => {
                            const roleBundleOption = new StringSelectMenuOptionBuilder()
                                .setLabel(`@${guildRole.name} - ${guild.name}`)
                                .setValue(Buffer.from(guildRole.id).toString('base64'))
                                .setDescription(`Adds the @${guildRole.name} (${guildRole.id}) to the bundle.`);
                            
                            roleOptionsList.push(roleBundleOption);
                        });
                    });

                    if(roleOptionsList.length < 1) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(interaction.client.embedColor)
                            .setTitle(`Error`)
                            .setDescription(embedErrorMessages.NO_ACCESS_TO_ANY_ROLES);

                        await interaction.editReply({ embeds: [errorEmbed] });
                        return;
                    }

                    const roleSelectorMenu = new StringSelectMenuBuilder()
                        .setCustomId('select-role-to-add')
                        .addOptions(roleOptionsList);

                    const roleSelectorActionRow = new ActionRowBuilder()
                        .addComponents(roleSelectorMenu);

                    const thirdReplyEmbed = new EmbedBuilder()
                        .setColor(interaction.client.embedColor)
                        .setTitle("Select a role to add to the bundle");

                    await interaction.editReply({ embeds: [thirdReplyEmbed], components: [roleSelectorActionRow]});

                    await responseInteraction.deferUpdate();

                } else if(operationType == 'delete'){

                    const selectQuery = 'SELECT id, identifier, token FROM roles WHERE token = ?';
                    const selectValues = [selectedRoleBundleToken];
                    const databaseRoles = await interaction.client.databaseManager.getSQLSelectorPromise(selectQuery, selectValues);

                    if(databaseRoles.length < 1){
                        const errorEmbed = new EmbedBuilder()
                            .setColor(interaction.client.embedColor)
                            .setTitle("Error")
                            .setDescription(embedErrorMessages.NO_ROLE_IN_BUNDLE);

                        await interaction.editReply({ embeds: [errorEmbed] });
                        return;
                    }

                    let roleOptionsList = [];

                    await databaseRoles.forEach(databaseRole => {
                        const roleOption = new StringSelectMenuOptionBuilder()
                            .setLabel(`@${databaseRole.identifier}`)
                            .setValue(Buffer.from(databaseRole.identifier).toString('base64'))
                            .setDescription(`Deletes the role with @${databaseRole.identifier} ID from the bundle.`);
                    
                        roleOptionsList.push(roleOption);
                    });

                    const roleSelectorMenu = new StringSelectMenuBuilder()
                        .setCustomId('select-role-to-delete')
                        .addOptions(roleOptionsList);

                    const roleSelectorActionRow = new ActionRowBuilder()
                        .addComponents(roleSelectorMenu);

                    const thirdReplyEmbed = new EmbedBuilder()
                        .setColor(interaction.client.embedColor)
                        .setTitle("Select a role to delete from the bundle");

                    await interaction.editReply({ embeds: [thirdReplyEmbed], components: [roleSelectorActionRow] });

                    await responseInteraction.deferUpdate();
                }

                
            } else if(responseInteraction.customId == 'select-role-to-add'){
                await interaction.editReply({ embeds: [loadingEmbed], components: [] });

                const roleSelectionBase64 = responseInteraction.values[0];
                selectedRoleIDtoAdd = Buffer.from(roleSelectionBase64, 'base64').toString('ascii');

                const selectQuery = 'SELECT id, identifier, token FROM roles WHERE identifier = ? AND token = ?';
                const selectValues = [selectedRoleIDtoAdd.toString(), selectedRoleBundleToken];
                const databaseExistingRoles = await interaction.client.databaseManager.getSQLSelectorPromise(selectQuery, selectValues);

                if(databaseExistingRoles.length > 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(interaction.client.embedColor)
                        .setTitle("Error")
                        .setDescription(embedErrorMessages.ROLE_ALREADY_IN_BUNDLE);

                    await interaction.editReply({ embeds: [errorEmbed] });
                    return;
                }

                const statementQuery = 'INSERT INTO roles (identifier, token) VALUES (?, ?)';

                await interaction.client.databaseManager.getSQLStatementPromise(statementQuery, selectedRoleIDtoAdd.toString(), selectedRoleBundleToken);

                const finalReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Success")
                    .setDescription(`Added the role with ${selectedRoleIDtoAdd} id to the ${selectedRoleBundleToken} role bundle.`);

                await interaction.editReply({ embeds: [finalReplyEmbed] });

                await responseInteraction.deferUpdate();

                responseCollector.stop(`Interaction complete`);

            } else if(responseInteraction.customId == 'select-role-to-delete'){
                await interaction.editReply({ embeds: [loadingEmbed], components: [] });

                const roleSelectionBase64 = responseInteraction.values[0];
                selectedRoleIDtoDelete = Buffer.from(roleSelectionBase64, 'base64').toString('ascii');

                const deleteQuery = 'DELETE FROM roles WHERE identifier = ? AND token = ?';

                await interaction.client.databaseManager.getSQLStatementPromise(deleteQuery, selectedRoleIDtoDelete.toString(), selectedRoleBundleToken);

                const finalReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Success")
                    .setDescription(`Deleted the role with ${selectedRoleIDtoDelete} id from the ${selectedRoleBundleToken} role bundle.`);

                await interaction.editReply({ embeds: [finalReplyEmbed] });

                await responseInteraction.deferUpdate();

                responseCollector.stop(`Interaction complete`);
            }
        });
    },
};