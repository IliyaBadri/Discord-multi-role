const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { embedErrorMessages } = require('../../modules/enums');

module.exports = {
    allowDM: false,
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Adds a role bundle to a user in discord.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user that the role bundle is going to be added to.')
                .setRequired(true)
        ),
    async execute(interaction) {

        const loadingEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Loading . . .")
        
        await interaction.reply({ embeds: [loadingEmbed] , ephemeral: true });

        const targetUser = interaction.options.getUser('user');

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

                let reportString = '';

                for(const databaseRole of databaseRoles){
                    for(const guildMap of interaction.client.guilds.cache){
                        const guild = guildMap[1];
                        const role = await guild.roles.fetch(databaseRole.identifier);
    
                        if(!role) return;
    
                        const guildMember = await guild.members.fetch(targetUser.id);
    
                        if(!guildMember) {
                            reportString = reportString + `@${role.name} - ${guild.name} => User wasn't in guild.\n\n`;
                            return;
                        }
    
                            
                        await guildMember.roles.add(role);
    
                        if(guildMember.roles.cache.has(role.id)){
                            reportString = reportString + `@${role.name} - ${guild.name} => Successfuly added.\n\n`;
                        } else {
                            reportString = reportString + `@${role.name} - ${guild.name} => Bot doesn't have permission.\n\n`;
                        }
                    };
                };

                const finalReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Successfully added a role bundle to a user.")
                    .setDescription(`Role bundle token: ${selectedRoleBundleToken} \n\nReport: \n${reportString}`);
                            
                await interaction.editReply({ embeds: [finalReplyEmbed] });

                await responseInteraction.deferUpdate();

                responseCollector.stop(`Interaction complete`);
            }
        });

        
    },
};