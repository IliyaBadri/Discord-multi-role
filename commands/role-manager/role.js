const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, PermissionsBitField, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
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

        for(const databaseRoleBundle of databaseRoleBundles){
            const roleBundleOption = new StringSelectMenuOptionBuilder()
                .setLabel(`#${databaseRoleBundle.token}`)
                .setValue(Buffer.from(databaseRoleBundle.token).toString('base64'))
                .setDescription(`Adds the #${databaseRoleBundle.token} role bundle to the user.`);

            roleBundleOptions.push(roleBundleOption);
        }

        const roleBundleSelectorMenu = new StringSelectMenuBuilder()
            .setCustomId('select-role-bundle')
            .addOptions(roleBundleOptions);

        const roleBundleSelectorActionRow = new ActionRowBuilder()
            .addComponents(roleBundleSelectorMenu);

        const firstReplyEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Select a role bundle to add to the user:");

        const response = await interaction.editReply({ embeds: [firstReplyEmbed], components: [roleBundleSelectorActionRow] });

        const responseCollector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

        let selectedRoleBundleToken = null;

        responseCollector.on('collect', async responseInteraction => {
            if(responseInteraction.customId == 'select-role-bundle'){
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

                let reportString = '';

                for(const databaseRole of databaseRoles){
                    for(const guild of allGuilds){

                        const roleExists = await guild.roles.cache.has(databaseRole.identifier);

                        if(!roleExists) continue;

                        const role = await guild.roles.fetch(databaseRole.identifier);

                        let guildMember;
                        try {
                            guildMember = await guild.members.fetch(targetUser.id);
                            if(!guildMember) throw null;
                        } catch {
                            reportString += `**@${role.name} - ${guild.name}**\n> User wasn't in guild.\n\n`;
                            continue;
                        }   

                        let guildInteractor;
                        try{
                            guildInteractor = await guild.members.fetch(interactionMember.user.id);
                            if(!guildInteractor) throw null;
                        } catch {
                            reportString += `**@${role.name} - ${guild.name}**\n> You weren't in the guild.\n\n`;
                            continue;
                        }

                        if(!guildInteractor.permissions.has(PermissionsBitField.Flags.Administrator)) {
                            reportString += `**@${role.name} - ${guild.name}**\n> You didn't have permission.\n\n`;
                            continue;
                        }
    
                        try{
                            await guildMember.roles.add(role);
                        } catch (error){
                            reportString += `**@${role.name} - ${guild.name}**\n> Bot didn't have permission.\n\n`;
                            continue;
                        } 

                        reportString += `**@${role.name} - ${guild.name}**\n> Successfuly added.\n\n`;
                    };
                };

                const finalReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Successfully added a role bundle to a user.")
                    .setDescription(`Role bundle token:\n\`\`\`${selectedRoleBundleToken}\`\`\` \n\nReport: \n${reportString}`);
                            
                await interaction.editReply({ embeds: [finalReplyEmbed] });

                responseCollector.stop(`Interaction complete`);
            }
        });

        
    },
};