const {
    Client, GatewayIntentBits, Partials, EmbedBuilder,
    ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder,
    ButtonStyle, PermissionFlagsBits, ChannelType, REST, Routes,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ActivityType
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

process.on('unhandledRejection', (r) => console.error('❌ [REJEIÇÃO]:', r));
process.on('uncaughtException', (e) => console.error('❌ [EXCEÇÃO]:', e));

const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });

const CONFIG_PATH = './database.json';
const EMOJI_PATH  = './emojis.json';
let db = {}, emojis = {};

const DEFAULT_BANNER = 'https://raw.githubusercontent.com/elias39824/Bot-de-ticket-teste/main/banner.png';

// Paleta de cores vibrantes
const C = {
    purple : 0xA855F7,
    gold   : 0xF59E0B,
    green  : 0x22C55E,
    red    : 0xEF4444,
    blue   : 0x3B82F6,
    pink   : 0xEC4899,
    dark   : 0x1E1E2E,
};

function loadData() {
    try {
        if (fs.existsSync(CONFIG_PATH)) { const d = fs.readFileSync(CONFIG_PATH,'utf-8'); db = d.trim() ? JSON.parse(d) : {}; }
        if (fs.existsSync(EMOJI_PATH))  emojis = JSON.parse(fs.readFileSync(EMOJI_PATH,'utf-8'));
    } catch(e) { console.error('Erro ao carregar dados:', e.message); }
}
function saveDB() { try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(db,null,4)); } catch(e) { console.error(e); } }

function getGuildConfig(guildId) {
    if (!db[guildId]) db[guildId] = {
        description : '✨ Selecione uma categoria abaixo e nossa equipe irá te atender o mais breve possível!',
        welcome_text: 'Olá {user}! 👋\n\nSeu ticket foi aberto com sucesso.\nDescreva sua solicitação com detalhes e aguarde um membro da equipe.',
        log_channel_id: null, admin_role_id: null, category_id: null,
        banner_url: DEFAULT_BANNER, categories: []
    };
    if (!db[guildId].banner_url) db[guildId].banner_url = DEFAULT_BANNER;
    saveDB();
    return db[guildId];
}
loadData();

// ─── Divisores e estilo visual ────────────────────────────────────────────────
const DIV  = '─────────────────────────────';
const STAR = '✦';

// ─── CONFIG EMBED ─────────────────────────────────────────────────────────────
function createConfigEmbed(guildId) {
    const cfg  = getGuildConfig(guildId);
    const cats = cfg.categories?.length
        ? cfg.categories.map(c => `> ${c.emoji || '🎫'} **${c.name}**`).join('\n')
        : '> *Nenhuma categoria ainda*';
    return new EmbedBuilder()
        .setColor(C.purple)
        .setAuthor({ name: '⚙️ Painel de Configuração', iconURL: client.user.displayAvatarURL() })
        .setTitle('Sistema de Tickets — Configurações')
        .setDescription(`${DIV}\n**Gerencie todas as configurações do sistema abaixo.**\n${DIV}`)
        .addFields(
            { name: '📝 Descrição do Painel', value: `> ${cfg.description}`, inline: false },
            { name: '👋 Mensagem de Boas-vindas', value: `> ${cfg.welcome_text}`, inline: false },
            { name: '👮 Cargo da Equipe',  value: cfg.admin_role_id   ? `<@&${cfg.admin_role_id}>`   : '`Não definido`', inline: true },
            { name: '📜 Canal de Logs',    value: cfg.log_channel_id  ? `<#${cfg.log_channel_id}>`   : '`Não definido`', inline: true },
            { name: '📁 Categoria Discord',value: cfg.category_id     ? `<#${cfg.category_id}>`      : '`Não definida`', inline: true },
            { name: '🖼️ Banner Atual', value: cfg.banner_url ? `[🔗 Ver imagem](${cfg.banner_url})` : '`Não definido`', inline: true },
            { name: `🎫 Categorias (${cfg.categories?.length || 0})`, value: cats, inline: false }
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setImage(cfg.banner_url || DEFAULT_BANNER)
        .setFooter({ text: '🔒 Apenas donos autorizados', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
}
function createConfigButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('set_desc')   .setLabel('Descrição')   .setEmoji('📝').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_welcome').setLabel('Boas-vindas') .setEmoji('👋').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_role')   .setLabel('Cargo')       .setEmoji('👮').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_banner') .setLabel('Banner/GIF')  .setEmoji('🖼️').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('set_logs').setLabel('Canal Logs')        .setEmoji('📜').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_cat') .setLabel('Categoria Discord') .setEmoji('📁').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('add_opt') .setLabel('Adicionar Categoria').setEmoji('➕').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('rem_opt') .setLabel('Remover Categoria') .setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        )
    ];
}

// ─── PAINEL PÚBLICO ───────────────────────────────────────────────────────────
function createTicketPanelEmbed(cfg, guild) {
    const cats = cfg.categories?.length
        ? cfg.categories.map(c => `> ${c.emoji || '🎫'}  **${c.name}**`).join('\n')
        : '> *Sem categorias configuradas*';
    return new EmbedBuilder()
        .setColor(C.purple)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) ?? client.user.displayAvatarURL() })
        .setTitle('🎟️  Central de Atendimento')
        .setDescription(
            `${STAR} ${DIV} ${STAR}\n\n` +
            `${cfg.description}\n\n` +
            `${STAR} ${DIV} ${STAR}\n\n` +
            `**📋  Categorias disponíveis:**\n${cats}\n\u200B`
        )
        .setImage(cfg.banner_url || DEFAULT_BANNER)
        .setFooter({ text: `${guild.name}  •  Sistema de Tickets`, iconURL: guild.iconURL({ dynamic: true }) ?? client.user.displayAvatarURL() })
        .setTimestamp();
}

// ─── EMBED DENTRO DO TICKET ───────────────────────────────────────────────────
function createTicketEmbed(cfg, category, user, guild) {
    const welcome = cfg.welcome_text.replace('{user}', user.toString());
    return new EmbedBuilder()
        .setColor(C.gold)
        .setAuthor({ name: `🎫  Ticket — ${category}`, iconURL: guild.iconURL({ dynamic: true }) ?? client.user.displayAvatarURL() })
        .setTitle(`✨  Bem-vindo ao seu atendimento!`)
        .setDescription(
            `${STAR} ${DIV} ${STAR}\n\n` +
            `${welcome}\n\n` +
            `${STAR} ${DIV} ${STAR}\n\u200B`
        )
        .addFields(
            { name: '👤  Solicitante',  value: `${user}`,             inline: true },
            { name: '📂  Categoria',    value: `\`${category}\``,     inline: true },
            { name: '🕐  Aberto em',    value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(cfg.banner_url || DEFAULT_BANNER)
        .setFooter({ text: `ID do usuário: ${user.id}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
}

// ─── LOG EMBED ────────────────────────────────────────────────────────────────
function createLogEmbed(type, user, category, channel, claimedBy) {
    const open = type === 'open';
    return new EmbedBuilder()
        .setColor(open ? C.green : C.red)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTitle(open ? '📂  Ticket Aberto' : '🔒  Ticket Fechado')
        .addFields(
            { name: '👤  Usuário',   value: `${user}`, inline: true },
            { name: '📂  Categoria', value: `\`${category || 'N/A'}\``, inline: true },
            { name: '📌  Canal',     value: channel ? `${channel}` : '`deletado`', inline: true },
            ...(claimedBy ? [{ name: '🙋  Atendido por', value: claimedBy, inline: true }] : [])
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();
}

// ─── INTERAÇÕES ───────────────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
    const guildId = interaction.guildId;
    if (!guildId) return;
    const cfg = getGuildConfig(guildId);
    const ownerIds = process.env.OWNER_ID ? process.env.OWNER_ID.split(',').map(id => id.trim()) : [];
    const isOwner  = ownerIds.includes(interaction.user.id);

    const denyEmbed = (msg) => new EmbedBuilder().setColor(C.red).setDescription(`❌  ${msg}`);

    try {
        // ── SLASH COMMANDS ──
        if (interaction.isChatInputCommand()) {
            if (!isOwner) return interaction.reply({ embeds: [denyEmbed('Apenas donos autorizados podem usar este bot.')], ephemeral: true });

            if (interaction.commandName === 'config')
                return interaction.reply({ embeds: [createConfigEmbed(guildId)], components: createConfigButtons(), ephemeral: true });

            if (interaction.commandName === 'cria_ticket') {
                await interaction.deferReply({ ephemeral: true });
                if (!cfg.categories?.length)
                    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(C.gold).setTitle('⚠️  Nenhuma Categoria').setDescription('Adicione categorias no `/config` antes de criar o painel!')] });

                const embed  = createTicketPanelEmbed(cfg, interaction.guild);
                const select = new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('🎫  Selecione uma categoria...')
                    .addOptions(cfg.categories.map(c => ({ label: c.name, value: c.name, emoji: c.emoji || '🎫', description: `Abrir ticket: ${c.name}` })));

                await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor(C.green).setTitle('✅  Painel Enviado!').setDescription('O painel de tickets foi criado com sucesso neste canal.')] });
            }
        }

        // ── BUTTONS ──
        if (interaction.isButton()) {
            const { customId } = interaction;
            const configBtns = ['set_desc','set_welcome','set_role','set_logs','set_cat','add_opt','rem_opt','set_banner'];

            if (configBtns.includes(customId) && !isOwner)
                return interaction.reply({ embeds: [denyEmbed('Apenas donos autorizados podem alterar as configurações.')], ephemeral: true });

            if (customId === 'set_desc') {
                const m = new ModalBuilder().setCustomId('modal_desc').setTitle('📝  Descrição do Painel');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_desc').setLabel('Texto do painel principal').setValue(cfg.description).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)));
                return interaction.showModal(m);
            }
            if (customId === 'set_welcome') {
                const m = new ModalBuilder().setCustomId('modal_welcome').setTitle('👋  Mensagem de Boas-vindas');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_welcome').setLabel('Texto dentro do ticket ({user} = menção)').setValue(cfg.welcome_text).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)));
                return interaction.showModal(m);
            }
            if (customId === 'set_banner') {
                const m = new ModalBuilder().setCustomId('modal_banner').setTitle('🖼️  Banner / GIF Animado');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_banner').setLabel('Cole a URL da imagem ou GIF animado').setValue(cfg.banner_url || DEFAULT_BANNER).setStyle(TextInputStyle.Short).setPlaceholder('https://exemplo.com/banner.gif').setMaxLength(500)));
                return interaction.showModal(m);
            }
            if (customId === 'set_role') {
                const sel = new RoleSelectMenuBuilder().setCustomId('select_role').setPlaceholder('Selecione o cargo da equipe...');
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
            }
            if (customId === 'set_logs') {
                const sel = new ChannelSelectMenuBuilder().setCustomId('select_logs').setPlaceholder('Selecione o canal de logs...').addChannelTypes(ChannelType.GuildText);
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
            }
            if (customId === 'set_cat') {
                const sel = new ChannelSelectMenuBuilder().setCustomId('select_cat').setPlaceholder('Selecione a categoria dos tickets...').addChannelTypes(ChannelType.GuildCategory);
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
            }
            if (customId === 'add_opt') {
                const m = new ModalBuilder().setCustomId('modal_add').setTitle('➕  Adicionar Categoria');
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_name').setLabel('Nome da categoria').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32).setPlaceholder('Ex: Suporte, Dúvidas, Parceria...')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_emoji').setLabel('Emoji (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(8).setPlaceholder('Ex: 🎫  💎  ⭐'))
                );
                return interaction.showModal(m);
            }
            if (customId === 'rem_opt') {
                if (!cfg.categories?.length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(C.gold).setDescription('⚠️  Não há categorias para remover.')], ephemeral: true });
                const sel = new StringSelectMenuBuilder().setCustomId('select_rem').setPlaceholder('Escolha a categoria para excluir...')
                    .addOptions(cfg.categories.map(c => ({ label: c.name, value: c.name, emoji: c.emoji || '🎫' })));
                return interaction.reply({ components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
            }

            // Botões dentro do ticket
            if (customId === 'close_ticket') {
                await interaction.reply({
                    embeds: [new EmbedBuilder().setColor(C.red)
                        .setTitle('🔒  Ticket Encerrado')
                        .setDescription(`Este ticket foi fechado por **${interaction.user}**.\n\n> O canal será **deletado em 3 segundos**...`)
                        .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp()
                    ]
                });
                const ticketEmbed = interaction.message.embeds[0];
                const ticketCfg   = getGuildConfig(guildId);
                if (ticketCfg.log_channel_id) {
                    const logCh = await interaction.guild.channels.fetch(ticketCfg.log_channel_id).catch(() => null);
                    if (logCh) {
                        const authorId = ticketEmbed?.footer?.text?.split(': ')[1];
                        const authorUser = authorId ? await client.users.fetch(authorId).catch(() => null) : null;
                        const category = ticketEmbed?.title?.replace('✨  Bem-vindo ao seu atendimento!','Ticket') || 'N/A';
                        if (authorUser) logCh.send({ embeds: [createLogEmbed('close', authorUser, category, null, interaction.user.toString())] });
                    }
                }
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (customId === 'claim_ticket') {
                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(C.green)
                    .setFooter({ text: `✅  Atendido por: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumido').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('notify_user').setLabel('Notificar').setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );
                await interaction.update({ embeds: [updatedEmbed], components: [newRow] });
                return interaction.followUp({
                    embeds: [new EmbedBuilder().setColor(C.green)
                        .setDescription(`🙋  **${interaction.user}** assumiu este ticket!\n> O atendimento foi iniciado. Por favor, aguarde.`)
                    ]
                });
            }

            if (customId === 'notify_user') {
                const footerText = interaction.message.embeds[0]?.footer?.text || '';
                const userId = footerText.split('ID do usuário: ')[1]?.trim();
                if (!userId) return interaction.reply({ content: '❌  Não foi possível identificar o usuário.', ephemeral: true });
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(C.pink)
                        .setDescription(`🔔  <@${userId}>, a equipe de suporte está te chamando!\n> Por favor, responda o mais rápido possível.`)
                    ],
                    allowedMentions: { users: [userId] }
                });
            }
        }

        // ── SELECT MENUS DE CONFIG ──
        if (interaction.isRoleSelectMenu()) {
            if (!isOwner) return interaction.reply({ embeds: [denyEmbed('Acesso negado.')], ephemeral: true });
            if (interaction.customId === 'select_role') {
                cfg.admin_role_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds: [new EmbedBuilder().setColor(C.green).setTitle('✅  Cargo Configurado').setDescription(`O cargo <@&${cfg.admin_role_id}> foi definido como equipe de suporte.`)], components: [] });
            }
        }
        if (interaction.isChannelSelectMenu()) {
            if (!isOwner) return interaction.reply({ embeds: [denyEmbed('Acesso negado.')], ephemeral: true });
            if (interaction.customId === 'select_logs') {
                cfg.log_channel_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds: [new EmbedBuilder().setColor(C.green).setTitle('✅  Canal de Logs').setDescription(`O canal <#${cfg.log_channel_id}> receberá os logs do sistema.`)], components: [] });
            }
            if (interaction.customId === 'select_cat') {
                cfg.category_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds: [new EmbedBuilder().setColor(C.green).setTitle('✅  Categoria Configurada').setDescription(`Os tickets serão criados em <#${cfg.category_id}>.`)], components: [] });
            }
        }
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_rem') {
                if (!isOwner) return interaction.reply({ embeds: [denyEmbed('Acesso negado.')], ephemeral: true });
                const removed = interaction.values[0];
                cfg.categories = cfg.categories.filter(c => c.name !== removed); saveDB();
                return interaction.update({ embeds: [new EmbedBuilder().setColor(C.green).setTitle('✅  Categoria Removida').setDescription(`A categoria **${removed}** foi excluída com sucesso.`)], components: [] });
            }

            if (interaction.customId === 'ticket_select') {
                await interaction.deferReply({ ephemeral: true });
                const category = interaction.values[0];

                const channelData = {
                    name: `🎫・${category.toLowerCase().replace(/\s+/g,'-')}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    topic: `🎫 Ticket de ${interaction.user.tag} | Categoria: ${category} | Aberto em: ${new Date().toLocaleString('pt-BR')}`,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
                        { id: client.user.id,       allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
                        ...(cfg.admin_role_id ? [{ id: cfg.admin_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] }] : [])
                    ]
                };
                if (cfg.category_id) {
                    const parent = await interaction.guild.channels.fetch(cfg.category_id).catch(() => null);
                    if (parent?.type === ChannelType.GuildCategory) channelData.parent = cfg.category_id;
                }

                const channel = await interaction.guild.channels.create(channelData);
                const btns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir Ticket').setEmoji('🙋').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('notify_user').setLabel('Notificar Usuário').setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );
                const mention = cfg.admin_role_id ? `<@&${cfg.admin_role_id}>` : '';
                await channel.send({ content: `${interaction.user} ${mention}`, embeds: [createTicketEmbed(cfg, category, interaction.user, interaction.guild)], components: [btns] });

                if (cfg.log_channel_id) {
                    const logCh = await interaction.guild.channels.fetch(cfg.log_channel_id).catch(() => null);
                    if (logCh) logCh.send({ embeds: [createLogEmbed('open', interaction.user, category, channel)] });
                }

                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor(C.green)
                        .setTitle('✅  Ticket Criado!')
                        .setDescription(`Seu ticket foi aberto em ${channel}!\n> Clique no canal para começar o atendimento.`)
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp()
                    ]
                });
            }
        }

        // ── MODALS ──
        if (interaction.isModalSubmit()) {
            if (!isOwner) return interaction.reply({ embeds: [denyEmbed('Acesso negado.')], ephemeral: true });
            if (interaction.customId === 'modal_desc')    cfg.description  = interaction.fields.getTextInputValue('in_desc');
            if (interaction.customId === 'modal_welcome') cfg.welcome_text = interaction.fields.getTextInputValue('in_welcome');
            if (interaction.customId === 'modal_banner')  cfg.banner_url   = interaction.fields.getTextInputValue('in_banner');
            if (interaction.customId === 'modal_add') {
                const name  = interaction.fields.getTextInputValue('in_name');
                const emoji = interaction.fields.getTextInputValue('in_emoji') || '🎫';
                if (!cfg.categories.find(c => c.name === name)) cfg.categories.push({ name, emoji });
            }
            saveDB();
            return interaction.update({ embeds: [createConfigEmbed(guildId)], components: createConfigButtons() });
        }
    } catch(err) { console.error('Erro:', err); }
});

client.once('ready', async () => {
    console.log(`✅  ${client.user.tag} está online!`);
    client.user.setPresence({ activities: [{ name: '🎫  Sistema de Tickets', type: ActivityType.Watching }], status: 'online' });
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: [
            { name: 'config',       description: '⚙️ Abre o painel de configuração (Apenas Donos)' },
            { name: 'cria_ticket',  description: '🎫 Envia o painel de tickets no canal (Apenas Donos)' }
        ]});
        console.log('✅  Comandos registrados!');
    } catch(e) { console.error('Erro ao registrar comandos:', e); }
});

client.login(process.env.DISCORD_TOKEN);
