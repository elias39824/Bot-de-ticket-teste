const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType,
    REST,
    Routes,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// --- Sistema Anti-Crash ---
process.on('unhandledRejection', (reason) => console.error('❌ [REJEIÇÃO]:', reason));
process.on('uncaughtException', (err) => console.error('❌ [EXCEÇÃO]:', err));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel]
});

const CONFIG_PATH = './database.json';
const EMOJI_PATH = './emojis.json';
let db = {};
let emojis = {};

// Carregamento de Dados
function loadData() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            db = data.trim() ? JSON.parse(data) : {};
        }
        if (fs.existsSync(EMOJI_PATH)) {
            emojis = JSON.parse(fs.readFileSync(EMOJI_PATH, 'utf-8'));
        }
    } catch (e) { console.error('Erro ao carregar dados:', e.message); }
}

function saveDB() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(db, null, 4));
    } catch (e) { console.error('Erro ao salvar DB:', e.message); }
}

function getGuildConfig(guildId) {
    if (!db[guildId]) {
        db[guildId] = {
            description: "Clique no menu abaixo para abrir um ticket!",
            welcome_text: "Olá {user}, bem-vindo ao seu ticket. Aguarde um atendente.",
            log_channel_id: null,
            admin_role_id: null,
            category_id: null,
            categories: []
        };
        saveDB();
    }
    return db[guildId];
}

loadData();

// --- Interface de Configuração ---

function createConfigEmbed(guildId) {
    const config = getGuildConfig(guildId);
    const cats = config.categories && config.categories.length > 0 
        ? config.categories.map(c => `${c.emoji || emojis.ticket} ${c.name}`).join('\n') 
        : 'Nenhuma cadastrada';

    return new EmbedBuilder()
        .setTitle(`${emojis.config_panel} Painel de Configuração V13 (Privado)`)
        .setColor(0x5865F2)
        .setDescription('Gerencie seu sistema de tickets. Apenas o dono autorizado pode usar este painel.')
        .addFields(
            { name: `${emojis.description} Painel Principal`, value: config.description || 'Padrão', inline: true },
            { name: `${emojis.ticket_welcome} Texto do Ticket`, value: config.welcome_text || 'Padrão', inline: true },
            { name: `${emojis.roles} Cargo Equipe`, value: config.admin_role_id ? `<@&${config.admin_role_id}>` : '❌ Não definido', inline: true },
            { name: `${emojis.logs} Canal Logs`, value: config.log_channel_id ? `<#${config.log_channel_id}>` : '❌ Não definido', inline: true },
            { name: `${emojis.category} Categoria`, value: config.category_id ? `<#${config.category_id}>` : '❌ Não definida', inline: true },
            { name: `${emojis.ticket} Opções Ativas`, value: cats, inline: false }
        );
}

function createConfigButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('set_desc').setLabel('DESC. PAINEL').setEmoji(emojis.description).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_welcome').setLabel('TEXTO TICKET').setEmoji(emojis.ticket_welcome).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_role').setLabel('CARGO').setEmoji(emojis.roles).setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('set_logs').setLabel('LOGS').setEmoji(emojis.logs).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_cat').setLabel('CATEGORIA').setEmoji(emojis.category).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_opt').setLabel('ADICIONAR OPÇÃO').setEmoji(emojis.add_option).setStyle(ButtonStyle.Success)
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rem_opt').setLabel('EXCLUIR CATEGORIA').setEmoji(emojis.remove_option).setStyle(ButtonStyle.Danger)
    );
    return [row1, row2, row3];
}

// --- Eventos ---

client.on('interactionCreate', async interaction => {
    const guildId = interaction.guildId;
    if (!guildId) return;
    const config = getGuildConfig(guildId);

    // TRAVA DE SEGURANÇA: APENAS O DONO (OWNER_ID) PODE USAR COMANDOS E CONFIGURAR
    const ownerId = process.env.OWNER_ID;

    try {
        if (interaction.isChatInputCommand()) {
            // Verifica se quem está usando é o dono autorizado
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: `❌ Você não tem permissão para usar este bot. Apenas o dono autorizado pode realizar configurações.`, ephemeral: true });
            }

            if (interaction.commandName === 'config') return interaction.reply({ embeds: [createConfigEmbed(guildId)], components: createConfigButtons(), ephemeral: true });
            if (interaction.commandName === 'cria_ticket') {
                await interaction.deferReply({ ephemeral: true });
                if (!config.categories.length) return interaction.editReply('❌ Adicione opções no `/config` primeiro!');
                const embed = new EmbedBuilder().setTitle('Central de Atendimento').setDescription(config.description).setColor(0x5865F2);
                const select = new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Selecione uma opção...')
                    .addOptions(config.categories.map(c => ({ label: c.name, value: c.name, emoji: c.emoji || emojis.ticket })));
                await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
                return interaction.editReply('✅ Painel enviado!');
            }
        }

        if (interaction.isButton()) {
            const { customId } = interaction;

            // Bloqueia interações do /config para quem não for o dono
            const configButtons = ['set_desc', 'set_welcome', 'set_role', 'set_logs', 'set_cat', 'add_opt', 'rem_opt'];
            if (configButtons.includes(customId) && interaction.user.id !== ownerId) {
                return interaction.reply({ content: '❌ Apenas o dono autorizado pode mexer nas configurações.', ephemeral: true });
            }

            if (customId === 'set_desc') {
                const modal = new ModalBuilder().setCustomId('modal_desc').setTitle('Descrição do Painel');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_desc').setLabel('Texto da mensagem principal').setValue(config.description).setStyle(TextInputStyle.Paragraph)));
                return await interaction.showModal(modal);
            }
            if (customId === 'set_welcome') {
                const modal = new ModalBuilder().setCustomId('modal_welcome').setTitle('Texto de Boas-vindas');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_welcome').setLabel('Texto dentro do ticket ({user} p/ marcar)').setValue(config.welcome_text).setStyle(TextInputStyle.Paragraph)));
                return await interaction.showModal(modal);
            }
            
            if (customId === 'set_role') {
                const select = new RoleSelectMenuBuilder().setCustomId('select_role').setPlaceholder('Selecione o cargo da equipe...');
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
            }
            if (customId === 'set_logs') {
                const select = new ChannelSelectMenuBuilder().setCustomId('select_logs').setPlaceholder('Selecione o canal de logs...').addChannelTypes(ChannelType.GuildText);
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
            }
            if (customId === 'set_cat') {
                const select = new ChannelSelectMenuBuilder().setCustomId('select_cat').setPlaceholder('Selecione a categoria dos tickets...').addChannelTypes(ChannelType.GuildCategory);
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
            }

            if (customId === 'add_opt') {
                const modal = new ModalBuilder().setCustomId('modal_add').setTitle('Adicionar Opção');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_name').setLabel('Nome da Opção').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_emoji').setLabel('Emoji da Opção').setStyle(TextInputStyle.Short).setRequired(false))
                );
                return await interaction.showModal(modal);
            }
            if (customId === 'rem_opt') {
                if (!config.categories.length) return interaction.reply({ content: 'Nada para remover.', ephemeral: true });
                const sel = new StringSelectMenuBuilder().setCustomId('select_rem').setPlaceholder('Escolha para excluir...')
                    .addOptions(config.categories.map(c => ({ label: c.name, value: c.name })));
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
            }

            // Ações de Ticket (Botões Internos - Qualquer um com cargo equipe ou autor pode usar dependendo da lógica)
            if (customId === 'close_ticket') {
                await interaction.reply(`${emojis.close} Fechando em 3s...`);
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }
            if (customId === 'claim_ticket') {
                const embed = EmbedBuilder.from(interaction.message.embeds[0]).setFooter({ text: `Atendido por: ${interaction.user.tag}` });
                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components[1].setDisabled(true);
                await interaction.update({ embeds: [embed], components: [row] });
                return interaction.followUp(`${emojis.claim} ${interaction.user} assumiu este ticket!`);
            }
            if (customId === 'notify_user') {
                const userId = interaction.message.embeds[0].footer.text.split(': ')[1];
                return interaction.reply({ content: `${emojis.notify} <@${userId}>, a equipe te chama!`, allowedMentions: { users: [userId] } });
            }
        }

        if (interaction.isRoleSelectMenu()) {
            if (interaction.user.id !== ownerId) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
            if (interaction.customId === 'select_role') {
                config.admin_role_id = interaction.values[0];
                saveDB();
                return interaction.update({ content: `✅ Cargo <@&${config.admin_role_id}> configurado!`, components: [] });
            }
        }
        if (interaction.isChannelSelectMenu()) {
            if (interaction.user.id !== ownerId) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
            if (interaction.customId === 'select_logs') {
                config.log_channel_id = interaction.values[0];
                saveDB();
                return interaction.update({ content: `✅ Canal de logs <#${config.log_channel_id}> configurado!`, components: [] });
            }
            if (interaction.customId === 'select_cat') {
                config.category_id = interaction.values[0];
                saveDB();
                return interaction.update({ content: `✅ Categoria <#${config.category_id}> configurada!`, components: [] });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_rem') {
                if (interaction.user.id !== ownerId) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
                config.categories = config.categories.filter(c => c.name !== interaction.values[0]);
                saveDB();
                return interaction.update({ content: '✅ Opção excluída!', components: [] });
            }
            if (interaction.customId === 'ticket_select') {
                await interaction.deferReply({ ephemeral: true });
                const category = interaction.values[0];
                const channelData = {
                    name: `${category.toLowerCase()}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        ...(config.admin_role_id ? [{ id: config.admin_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : [])
                    ]
                };
                if (config.category_id) {
                    const parent = await interaction.guild.channels.fetch(config.category_id).catch(() => null);
                    if (parent && parent.type === ChannelType.GuildCategory) channelData.parent = config.category_id;
                }
                const channel = await interaction.guild.channels.create(channelData);
                
                const btns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setEmoji(emojis.close).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir Ticket').setEmoji(emojis.claim).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('notify_user').setLabel('Notifica Usuário').setEmoji(emojis.notify).setStyle(ButtonStyle.Secondary)
                );
                
                const welcome = config.welcome_text.replace('{user}', `<@${interaction.user.id}>`);
                await channel.send({ 
                    content: `${interaction.user} | ${config.admin_role_id ? `<@&${config.admin_role_id}>` : ''}`, 
                    embeds: [new EmbedBuilder().setTitle(`Atendimento: ${category}`).setDescription(welcome).setColor(0x2F3136).setFooter({ text: `Autor: ${interaction.user.id}` })], 
                    components: [btns] 
                });
                return interaction.editReply(`✅ Ticket aberto: ${channel}`);
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.user.id !== ownerId) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
            if (interaction.customId === 'modal_desc') config.description = interaction.fields.getTextInputValue('in_desc');
            if (interaction.customId === 'modal_welcome') config.welcome_text = interaction.fields.getTextInputValue('in_welcome');
            if (interaction.customId === 'modal_add') config.categories.push({ name: interaction.fields.getTextInputValue('in_name'), emoji: interaction.fields.getTextInputValue('in_emoji') || emojis.ticket });
            saveDB();
            return await interaction.update({ embeds: [createConfigEmbed(guildId)], components: createConfigButtons() });
        }
    } catch (err) { console.error(err); }
});

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} Online (Versão Privada)!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: [
            { name: 'config', description: 'Configura o servidor (Apenas Dono)' },
            { name: 'cria_ticket', description: 'Envia o painel (Apenas Dono)' }
        ]});
    } catch (e) {}
});

client.login(process.env.DISCORD_TOKEN);
