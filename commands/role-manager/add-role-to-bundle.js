const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, PermissionsBitField, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { embedErrorMessages } = require('../../modules/enums');

module.exports = {
    allowDM: false,
    data: new SlashCommandBuilder()
        .setName('add-role-to-bundle')
        .setDescription('Adds a role to a role bundle.')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role that is going to be added to the bundle.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const loadingEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Loading . . .")
        
        await interaction.reply({ embeds: [loadingEmbed] , ephemeral: true });

        const targetRole = interaction.options.getRole('role');

        const interactionMember = interaction.member;

        if(!interactionMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(interaction.client.embedColor)
                .setTitle(`Error`)
                .setDescription(embedErrorMessages.UNAUTHORIZED_ADMINISTRATOR);

            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        };

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
                .setDescription(`Adds the role to the #${databaseRoleBundle.token} role bundle.`);

            roleBundleOptions.push(roleBundleOption);
        }

        const roleBundleSelectorMenu = new StringSelectMenuBuilder()
            .setCustomId('select-role-bundle')
            .addOptions(roleBundleOptions);

        const roleBundleSelectorActionRow = new ActionRowBuilder()
            .addComponents(roleBundleSelectorMenu);

        const firstReplyEmbed = new EmbedBuilder()
            .setColor(interaction.client.embedColor)
            .setTitle("Select a role bundle to add the role to:");
                    

        const response = await interaction.editReply({ embeds: [firstReplyEmbed], components: [roleBundleSelectorActionRow] });

        const responseCollector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

        let selectedRoleBundleToken = null;
        responseCollector.on('collect', async responseInteraction => {
            if(responseInteraction.customId == 'select-role-bundle'){
                await responseInteraction.deferUpdate();
                await interaction.editReply({ components: [] });

                const roleBundleSelectionBase64 = responseInteraction.values[0];
                selectedRoleBundleToken = Buffer.from(roleBundleSelectionBase64, 'base64').toString('ascii');

                const selectQuery = 'SELECT id, identifier, token FROM roles WHERE identifier = ? AND token = ?';
                const selectValues = [targetRole.id.toString() , selectedRoleBundleToken];
                const databaseExistingRoles = await interaction.client.databaseManager.getSQLSelectorPromise(selectQuery, selectValues);

                if(databaseExistingRoles.length > 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(interaction.client.embedColor)
                        .setTitle(`Error`)
                        .setDescription(embedErrorMessages.ROLE_ALREADY_IN_BUNDLE);

                    await interaction.editReply({ embeds: [errorEmbed] });
                    return;
                }

                const statementQuery = 'INSERT INTO roles (identifier, token) VALUES (?, ?)';

                await interaction.client.databaseManager.getSQLStatementPromise(statementQuery, targetRole.id.toString(), selectedRoleBundleToken);

                const finalReplyEmbed = new EmbedBuilder()
                    .setColor(interaction.client.embedColor)
                    .setTitle("Successfully added the role to the role bundle.")
                    .setDescription(`**Role bundle token:**\n\`\`\`${selectedRoleBundleToken}\`\`\`\n\n**Role:** \n\`\`\`@${targetRole.name}\`\`\`\n**Server:** \n\`\`\`${targetRole.guild.name}\`\`\`\n**ID:**\n\`\`\`${targetRole.id}\`\`\``);
                            
                await interaction.editReply({ embeds: [finalReplyEmbed] });

                responseCollector.stop(`Interaction complete`);
            }
        });

        
    },
};