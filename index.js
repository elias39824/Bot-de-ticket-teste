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
    RoleSelectMenuBuilder,
    ActivityType
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

process.on('unhandledRejection', (reason) => console.error('❌ [REJEIÇÃO]:', reason));
process.on('uncaughtException', (err) => console.error('❌ [EXCEÇÃO]:', err));

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel]
});

const CONFIG_PATH = './database.json';
const EMOJI_PATH = './emojis.json';
let db = {};
let emojis = {};

// Cores do tema
const COLORS = {
    primary:   0x5865F2,
    success:   0x57F287,
    danger:    0xED4245,
    warning:   0xFEE75C,
    dark:      0x2B2D31,
    ticket:    0x9B59B6,
    blurple:   0x5865F2,
    gold:      0xFFD700,
};

const DEFAULT_BANNER = 'https://raw.githubusercontent.com/elias39824/Bot-de-ticket-teste/main/banner.png';

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
            description: '✨ Selecione uma categoria abaixo para abrir seu ticket.\nNossa equipe responderá o mais breve possível!',
            welcome_text: 'Olá {user}! 👋\n\nSeu ticket foi aberto com sucesso. Por favor, descreva sua solicitação com detalhes e aguarde um membro da equipe.',
            log_channel_id: null,
            admin_role_id: null,
            category_id: null,
            banner_url: DEFAULT_BANNER,
            categories: []
        };
        saveDB();
    }
    if (!db[guildId].banner_url) {
        db[guildId].banner_url = DEFAULT_BANNER;
        saveDB();
    }
    return db[guildId];
}

loadData();

// ─── EMBED: Painel de Configuração ───────────────────────────────────────────
function createConfigEmbed(guildId) {
    const config = getGuildConfig(guildId);
    const cats = config.categories?.length
        ? config.categories.map(c => `> ${c.emoji || '🎫'} **${c.name}**`).join('\n')
        : '> *Nenhuma categoria cadastrada*';

    return new EmbedBuilder()
        .setAuthor({ name: '⚙️ Painel de Configuração', iconURL: client.user.displayAvatarURL() })
        .setColor(COLORS.primary)
        .setDescription('## Sistema de Tickets\nGerencie todas as configurações do seu sistema de atendimento.\n\u200B')
        .addFields(
            {
                name: '📝 Descrição do Painel',
                value: `\`\`\`${config.description || 'Padrão'}\`\`\``,
                inline: false
            },
            {
                name: '👋 Mensagem de Boas-vindas',
                value: `\`\`\`${config.welcome_text || 'Padrão'}\`\`\``,
                inline: false
            },
            {
                name: '👮 Cargo da Equipe',
                value: config.admin_role_id ? `<@&${config.admin_role_id}>` : '❌ Não definido',
                inline: true
            },
            {
                name: '📜 Canal de Logs',
                value: config.log_channel_id ? `<#${config.log_channel_id}>` : '❌ Não definido',
                inline: true
            },
            {
                name: '📁 Categoria',
                value: config.category_id ? `<#${config.category_id}>` : '❌ Não definida',
                inline: true
            },
            {
                name: '🖼️ Banner',
                value: config.banner_url ? `[Ver Banner](${config.banner_url})` : '❌ Não definido',
                inline: true
            },
            {
                name: `🎫 Categorias Ativas (${config.categories?.length || 0})`,
                value: cats,
                inline: false
            }
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setImage(config.banner_url || DEFAULT_BANNER)
        .setFooter({ text: 'Sistema de Tickets • Apenas donos autorizados', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
}

function createConfigButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('set_desc').setLabel('Descrição').setEmoji('📝').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_welcome').setLabel('Boas-vindas').setEmoji('👋').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_role').setLabel('Cargo').setEmoji('👮').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_banner').setLabel('Banner').setEmoji('🖼️').setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('set_logs').setLabel('Canal Logs').setEmoji('📜').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_cat').setLabel('Categoria').setEmoji('📁').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_opt').setLabel('Adicionar Categoria').setEmoji('➕').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('rem_opt').setLabel('Remover Categoria').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );
    return [row1, row2];
}

// ─── EMBED: Painel de Tickets (público) ──────────────────────────────────────
function createTicketPanelEmbed(config, guild) {
    const cats = config.categories?.length
        ? config.categories.map(c => `> ${c.emoji || '🎫'} **${c.name}**`).join('\n')
        : '> *Sem categorias configuradas*';

    return new EmbedBuilder()
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
        .setColor(COLORS.ticket)
        .setTitle('🎟️ Central de Atendimento')
        .setDescription(`${config.description}\n\u200B\n**Categorias disponíveis:**\n${cats}\n\u200B`)
        .setImage(config.banner_url || DEFAULT_BANNER)
        .setFooter({ text: `${guild.name} • Sistema de Tickets`, iconURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
        .setTimestamp();
}

// ─── EMBED: Dentro do Ticket ──────────────────────────────────────────────────
function createTicketEmbed(config, category, user, guild) {
    const welcome = config.welcome_text.replace('{user}', user.toString());

    return new EmbedBuilder()
        .setAuthor({ name: `Ticket — ${category}`, iconURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL() })
        .setColor(COLORS.ticket)
        .setTitle(`🎫 Atendimento: ${category}`)
        .setDescription(`${welcome}\n\u200B`)
        .addFields(
            { name: '👤 Solicitante', value: user.toString(), inline: true },
            { name: '📂 Categoria', value: `\`${category}\``, inline: true },
            { name: '🕐 Aberto em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(config.banner_url || DEFAULT_BANNER)
        .setFooter({ text: `ID do usuário: ${user.id}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
}

// ─── EMBED: Log ──────────────────────────────────────────────────────────────
function createLogEmbed(type, user, category, channel, claimedBy) {
    const isOpen = type === 'open';
    return new EmbedBuilder()
        .setColor(isOpen ? COLORS.success : COLORS.danger)
        .setTitle(isOpen ? '📂 Ticket Aberto' : '🔒 Ticket Fechado')
        .addFields(
            { name: '👤 Usuário', value: user.toString(), inline: true },
            { name: '📂 Categoria', value: `\`${category || 'N/A'}\``, inline: true },
            { name: '📌 Canal', value: channel ? channel.toString() : '`deletado`', inline: true },
            ...(claimedBy ? [{ name: '🙋 Atendido por', value: claimedBy, inline: true }] : [])
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();
}

// ─── EVENTOS ──────────────────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
    const guildId = interaction.guildId;
    if (!guildId) return;
    const config = getGuildConfig(guildId);
    const ownerIds = process.env.OWNER_ID ? process.env.OWNER_ID.split(',').map(id => id.trim()) : [];

    try {
        // ── Slash Commands ──
        if (interaction.isChatInputCommand()) {
            if (!ownerIds.includes(interaction.user.id)) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.danger)
                        .setTitle('❌ Sem Permissão')
                        .setDescription('Apenas os donos autorizados podem usar este bot.')
                    ], ephemeral: true
                });
            }

            if (interaction.commandName === 'config') {
                return interaction.reply({
                    embeds: [createConfigEmbed(guildId)],
                    components: createConfigButtons(),
                    ephemeral: true
                });
            }

            if (interaction.commandName === 'cria_ticket') {
                await interaction.deferReply({ ephemeral: true });
                if (!config.categories?.length) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(COLORS.warning)
                            .setTitle('⚠️ Nenhuma Categoria')
                            .setDescription('Adicione categorias no `/config` antes de criar o painel!')
                        ]
                    });
                }

                const embed = createTicketPanelEmbed(config, interaction.guild);
                const select = new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('🎫 Selecione uma categoria...')
                    .addOptions(config.categories.map(c => ({
                        label: c.name,
                        value: c.name,
                        emoji: c.emoji || '🎫',
                        description: `Abrir ticket: ${c.name}`
                    })));

                await interaction.channel.send({
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(select)]
                });
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.success)
                        .setTitle('✅ Painel Enviado!')
                        .setDescription('O painel de tickets foi enviado com sucesso neste canal.')
                    ]
                });
            }
        }

        // ── Buttons ──
        if (interaction.isButton()) {
            const { customId } = interaction;
            const configButtons = ['set_desc', 'set_welcome', 'set_role', 'set_logs', 'set_cat', 'add_opt', 'rem_opt', 'set_banner'];

            if (configButtons.includes(customId) && !ownerIds.includes(interaction.user.id)) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(COLORS.danger).setDescription('❌ Apenas donos autorizados podem alterar as configurações.')],
                    ephemeral: true
                });
            }

            if (customId === 'set_desc') {
                const modal = new ModalBuilder().setCustomId('modal_desc').setTitle('📝 Descrição do Painel');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('in_desc').setLabel('Texto exibido no painel principal').setValue(config.description).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)
                ));
                return await interaction.showModal(modal);
            }

            if (customId === 'set_welcome') {
                const modal = new ModalBuilder().setCustomId('modal_welcome').setTitle('👋 Mensagem de Boas-vindas');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('in_welcome').setLabel('Mensagem dentro do ticket ({user} = menção)').setValue(config.welcome_text).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)
                ));
                return await interaction.showModal(modal);
            }

            if (customId === 'set_banner') {
                const modal = new ModalBuilder().setCustomId('modal_banner').setTitle('🖼️ URL do Banner');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('in_banner').setLabel('URL da imagem ou GIF animado').setValue(config.banner_url || DEFAULT_BANNER).setStyle(TextInputStyle.Short).setPlaceholder('https://exemplo.com/banner.gif').setMaxLength(500)
                ));
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
                const modal = new ModalBuilder().setCustomId('modal_add').setTitle('➕ Adicionar Categoria');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('in_name').setLabel('Nome da categoria').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32).setPlaceholder('Ex: Suporte, Dúvidas, Parceria...')
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('in_emoji').setLabel('Emoji da categoria (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(8).setPlaceholder('Ex: 🎫 ou <:emoji:id>')
                    )
                );
                return await interaction.showModal(modal);
            }

            if (customId === 'rem_opt') {
                if (!config.categories?.length) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setColor(COLORS.warning).setDescription('⚠️ Não há categorias para remover.')],
                        ephemeral: true
                    });
                }
                const sel = new StringSelectMenuBuilder()
                    .setCustomId('select_rem')
                    .setPlaceholder('Selecione a categoria para excluir...')
                    .addOptions(config.categories.map(c => ({ label: c.name, value: c.name, emoji: c.emoji || '🎫' })));
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
            }

            // ── Botões dentro do ticket ──
            if (customId === 'close_ticket') {
                const closedBy = interaction.user;
                const embed = new EmbedBuilder()
                    .setColor(COLORS.danger)
                    .setTitle('🔒 Ticket Encerrado')
                    .setDescription(`Este ticket foi fechado por ${closedBy}.\n\nO canal será deletado em **3 segundos**...`)
                    .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });

                // Log
                const ticketEmbed = interaction.message.embeds[0];
                const ticketConfig = getGuildConfig(guildId);
                if (ticketConfig.log_channel_id) {
                    const logCh = await interaction.guild.channels.fetch(ticketConfig.log_channel_id).catch(() => null);
                    if (logCh) {
                        const authorId = ticketEmbed?.footer?.text?.split(': ')[1];
                        const authorUser = authorId ? await client.users.fetch(authorId).catch(() => null) : null;
                        const category = ticketEmbed?.title?.replace('🎫 Atendimento: ', '') || 'N/A';
                        if (authorUser) logCh.send({ embeds: [createLogEmbed('close', authorUser, category, null, closedBy.toString())] });
                    }
                }
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (customId === 'claim_ticket') {
                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(COLORS.success)
                    .setFooter({ text: `✅ Atendido por: ${interaction.user.tag} • ID: ${interaction.message.embeds[0]?.footer?.text?.split('ID do usuário: ')[1] || ''}`, iconURL: interaction.user.displayAvatarURL() });
                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumido').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('notify_user').setLabel('Notificar').setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );
                await interaction.update({ embeds: [embed], components: [newRow] });
                return interaction.followUp({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.success)
                        .setDescription(`🙋 ${interaction.user} **assumiu este ticket!** O atendimento foi iniciado.`)
                    ]
                });
            }

            if (customId === 'notify_user') {
                const footerText = interaction.message.embeds[0]?.footer?.text || '';
                const userId = footerText.split('ID do usuário: ')[1]?.trim();
                if (!userId) return interaction.reply({ content: '❌ Não foi possível identificar o usuário.', ephemeral: true });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.warning)
                        .setDescription(`🔔 <@${userId}>, a equipe de suporte está te chamando! Por favor, responda.`)
                    ],
                    allowedMentions: { users: [userId] }
                });
            }
        }

        // ── Selects de Config ──
        if (interaction.isRoleSelectMenu()) {
            if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
            if (interaction.customId === 'select_role') {
                config.admin_role_id = interaction.values[0];
                saveDB();
                return interaction.update({
                    embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Cargo Configurado').setDescription(`O cargo <@&${config.admin_role_id}> foi definido como equipe de suporte.`)],
                    components: []
                });
            }
        }

        if (interaction.isChannelSelectMenu()) {
            if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
            if (interaction.customId === 'select_logs') {
                config.log_channel_id = interaction.values[0];
                saveDB();
                return interaction.update({
                    embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Canal de Logs Configurado').setDescription(`O canal <#${config.log_channel_id}> receberá os logs do sistema.`)],
                    components: []
                });
            }
            if (interaction.customId === 'select_cat') {
                config.category_id = interaction.values[0];
                saveDB();
                return interaction.update({
                    embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Categoria Configurada').setDescription(`Os tickets serão criados em <#${config.category_id}>.`)],
                    components: []
                });
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_rem') {
                if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });
                const removed = interaction.values[0];
                config.categories = config.categories.filter(c => c.name !== removed);
                saveDB();
                return interaction.update({
                    embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle('✅ Categoria Removida').setDescription(`A categoria **${removed}** foi excluída com sucesso.`)],
                    components: []
                });
            }

            if (interaction.customId === 'ticket_select') {
                await interaction.deferReply({ ephemeral: true });
                const category = interaction.values[0];

                const channelData = {
                    name: `🎫│${category.toLowerCase().replace(/\s+/g, '-')}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    topic: `Ticket de ${interaction.user.tag} | Categoria: ${category}`,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
                        },
                        {
                            id: client.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
                        },
                        ...(config.admin_role_id ? [{
                            id: config.admin_role_id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
                        }] : [])
                    ]
                };

                if (config.category_id) {
                    const parent = await interaction.guild.channels.fetch(config.category_id).catch(() => null);
                    if (parent?.type === ChannelType.GuildCategory) channelData.parent = config.category_id;
                }

                const channel = await interaction.guild.channels.create(channelData);

                const ticketButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir Ticket').setEmoji('🙋').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('notify_user').setLabel('Notificar Usuário').setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );

                const mention = config.admin_role_id ? `<@&${config.admin_role_id}>` : '';
                await channel.send({
                    content: `${interaction.user} ${mention}`,
                    embeds: [createTicketEmbed(config, category, interaction.user, interaction.guild)],
                    components: [ticketButtons]
                });

                // Log de abertura
                if (config.log_channel_id) {
                    const logCh = await interaction.guild.channels.fetch(config.log_channel_id).catch(() => null);
                    if (logCh) logCh.send({ embeds: [createLogEmbed('open', interaction.user, category, channel)] });
                }

                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.success)
                        .setTitle('✅ Ticket Aberto!')
                        .setDescription(`Seu ticket foi criado em ${channel}!\nClique no canal para acessar.`)
                    ]
                });
            }
        }

        // ── Modals ──
        if (interaction.isModalSubmit()) {
            if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Acesso negado.', ephemeral: true });

            if (interaction.customId === 'modal_desc') config.description = interaction.fields.getTextInputValue('in_desc');
            if (interaction.customId === 'modal_welcome') config.welcome_text = interaction.fields.getTextInputValue('in_welcome');
            if (interaction.customId === 'modal_banner') config.banner_url = interaction.fields.getTextInputValue('in_banner');
            if (interaction.customId === 'modal_add') {
                const name = interaction.fields.getTextInputValue('in_name');
                const emoji = interaction.fields.getTextInputValue('in_emoji') || '🎫';
                if (!config.categories.find(c => c.name === name)) {
                    config.categories.push({ name, emoji });
                }
            }

            saveDB();
            return await interaction.update({
                embeds: [createConfigEmbed(guildId)],
                components: createConfigButtons()
            });
        }
    } catch (err) {
        console.error('Erro na interação:', err);
    }
});

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} está online e pronto!`);

    client.user.setPresence({
        activities: [{ name: '🎫 Sistema de Tickets', type: ActivityType.Watching }],
        status: 'online'
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: [
                { name: 'config', description: '⚙️ Abre o painel de configuração do bot (Apenas Donos)' },
                { name: 'cria_ticket', description: '🎫 Envia o painel de tickets no canal atual (Apenas Donos)' }
            ]
        });
        console.log('✅ Comandos registrados!');
    } catch (e) {
        console.error('Erro ao registrar comandos:', e);
    }
});

client.login(process.env.DISCORD_TOKEN);
