const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { embedErrorMessages } = require('../../modules/enums');

module.exports = {
    allowDM: false,
    data: new SlashCommandBuilder()
        .setName('list-roles-in-bundle')
        .setDescription('Lists all of the roles that are in a bundle.'),
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

        for (const databaseRoleBundle of databaseRoleBundles){
            const roleBundleOption = new StringSelectMenuOptionBuilder()
                .setLabel(`#${databaseRoleBundle.token}`)
                .setValue(Buffer.from(databaseRoleBundle.token).toString('base64'))
                .setDescription(`List the roles inside the #${databaseRoleBundle.token} role bundle.`);

            roleBundleOptions.push(roleBundleOption);
        }

        const roleBundleSelectorMenu = new StringSelectMenuBuilder()
            .setCustomId('select-role-bundle')
            .addOptions(roleBundleOptions);

        const roleBundleSelectorActionRow = new ActionRowBuilder()
            .addComponents(roleBundleSelectorMenu);

        const firstReplyEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Select a role bundle to be listed:");
                    

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

                let rolesListString = '';

                let allGuilds = [];

                for(const guildMap of interaction.client.guilds.cache){
                    allGuilds.push(guildMap[1]);
                }

                for(const databaseRole of databaseRoles){
                    let roleExists = false;
                    for(const guild of allGuilds){
                        const roleExistsInGuild = await guild.roles.cache.has(databaseRole.identifier);

                        if(!roleExistsInGuild) continue;

                        roleExists = true;

                        const role = await guild.roles.fetch(databaseRole.identifier);

                        rolesListString += `**@${role.name}**\n> **ID:** ${databaseRole.identifier}\n> **SERVER:** ${guild.name}\n\n`;
                        break;
                    }

                    if(!roleExists) {
                        rolesListString += `**UNKNOWN ROLE**\n> **ID:** ${databaseRole.identifier}\n\n`;
                    }
                }

                if(rolesListString == '') {
                    rolesListString = 'No roles found!'
                }

                const finalReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Roles inside role bundle:")
                    .setDescription(`**Role bundle token:** \n\`\`\`${selectedRoleBundleToken}\`\`\`\n\n**Roles:**\n\n${rolesListString}`);
                            
                await interaction.editReply({ embeds: [finalReplyEmbed] });

                responseCollector.stop(`Interaction complete`);
            }
        });

        
    },
};