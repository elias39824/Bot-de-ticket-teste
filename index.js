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
process.on('uncaughtException',  (e) => console.error('❌ [EXCEÇÃO]:', e));

const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });

const CONFIG_PATH   = './database.json';
const DEFAULT_BANNER = 'https://raw.githubusercontent.com/elias39824/Bot-de-ticket-teste/main/banner.png';

let db = {};
const C = { purple:0xA855F7, gold:0xF59E0B, green:0x22C55E, red:0xEF4444, blue:0x3B82F6, pink:0xEC4899, cyan:0x06B6D4 };
const DIV  = '─────────────────────────────';
const STAR = '✦';

function loadData() {
    try { if (fs.existsSync(CONFIG_PATH)) { const d = fs.readFileSync(CONFIG_PATH,'utf-8'); db = d.trim() ? JSON.parse(d) : {}; } }
    catch(e) { console.error('Erro ao carregar dados:', e.message); }
}
function saveDB() { try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(db,null,4)); } catch(e) { console.error(e); } }
function getGuildConfig(guildId) {
    if (!db[guildId]) db[guildId] = {
        description:'✨ Selecione uma categoria abaixo e nossa equipe irá te atender o mais breve possível!',
        welcome_text:'Olá {user}! 👋\n\nSeu ticket foi aberto com sucesso.\nDescreva sua solicitação com detalhes e aguarde um membro da equipe.',
        log_channel_id:null, admin_role_id:null, category_id:null,
        banner_url:DEFAULT_BANNER, categories:[]
    };
    if (!db[guildId].banner_url) db[guildId].banner_url = DEFAULT_BANNER;
    saveDB(); return db[guildId];
}
loadData();

// ─── EMBEDS ───────────────────────────────────────────────────────────────────
function createConfigEmbed(guildId) {
    const cfg  = getGuildConfig(guildId);
    const cats = cfg.categories?.length ? cfg.categories.map(c => `> ${c.emoji||'🎫'} **${c.name}**`).join('\n') : '> *Nenhuma categoria ainda*';
    return new EmbedBuilder()
        .setColor(C.purple)
        .setAuthor({ name:'⚙️ Painel de Configuração', iconURL:client.user.displayAvatarURL() })
        .setTitle('Sistema de Tickets — Configurações')
        .setDescription(`${DIV}\n**Gerencie todas as configurações do sistema abaixo.**\n${DIV}`)
        .addFields(
            { name:'📝 Descrição do Painel',    value:`> ${cfg.description}`, inline:false },
            { name:'👋 Mensagem de Boas-vindas', value:`> ${cfg.welcome_text}`, inline:false },
            { name:'👮 Cargo da Equipe',   value:cfg.admin_role_id  ? `<@&${cfg.admin_role_id}>`  : '`Não definido`', inline:true },
            { name:'📜 Canal de Logs',     value:cfg.log_channel_id ? `<#${cfg.log_channel_id}>` : '`Não definido`', inline:true },
            { name:'📁 Categoria Discord', value:cfg.category_id    ? `<#${cfg.category_id}>`    : '`Não definida`', inline:true },
            { name:'🖼️ Banner',            value:cfg.banner_url ? `[🔗 Ver imagem](${cfg.banner_url})` : '`Não definido`', inline:true },
            { name:`🎫 Categorias (${cfg.categories?.length||0})`, value:cats, inline:false }
        )
        .setThumbnail(client.user.displayAvatarURL({ size:256 }))
        .setImage(cfg.banner_url||DEFAULT_BANNER)
        .setFooter({ text:'🔒 Apenas donos autorizados', iconURL:client.user.displayAvatarURL() })
        .setTimestamp();
}
function createConfigButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('set_desc')   .setLabel('Descrição')    .setEmoji('📝').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_welcome').setLabel('Boas-vindas')  .setEmoji('👋').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_role')   .setLabel('Cargo')        .setEmoji('👮').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_banner') .setLabel('Banner/GIF')   .setEmoji('🖼️').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('set_logs').setLabel('Canal Logs')         .setEmoji('📜').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_cat') .setLabel('Categoria Discord')  .setEmoji('📁').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('add_opt') .setLabel('Adicionar Categoria').setEmoji('➕').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('rem_opt') .setLabel('Remover Categoria')  .setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        )
    ];
}
function createTicketPanelEmbed(cfg, guild) {
    const cats = cfg.categories?.length ? cfg.categories.map(c => `> ${c.emoji||'🎫'}  **${c.name}**`).join('\n') : '> *Sem categorias configuradas*';
    return new EmbedBuilder()
        .setColor(C.purple)
        .setAuthor({ name:guild.name, iconURL:guild.iconURL({ dynamic:true })??client.user.displayAvatarURL() })
        .setTitle('🎟️  Central de Atendimento')
        .setDescription(`${STAR} ${DIV} ${STAR}\n\n${cfg.description}\n\n${STAR} ${DIV} ${STAR}\n\n**📋  Categorias disponíveis:**\n${cats}\n\u200B`)
        .setImage(cfg.banner_url||DEFAULT_BANNER)
        .setFooter({ text:`${guild.name}  •  Sistema de Tickets`, iconURL:guild.iconURL({ dynamic:true })??client.user.displayAvatarURL() })
        .setTimestamp();
}
function createTicketEmbed(cfg, category, user, guild) {
    return new EmbedBuilder()
        .setColor(C.gold)
        .setAuthor({ name:`🎫  Ticket — ${category}`, iconURL:guild.iconURL({ dynamic:true })??client.user.displayAvatarURL() })
        .setTitle('✨  Bem-vindo ao seu atendimento!')
        .setDescription(`${STAR} ${DIV} ${STAR}\n\n${cfg.welcome_text.replace('{user}',user.toString())}\n\n${STAR} ${DIV} ${STAR}\n\u200B`)
        .addFields(
            { name:'👤  Solicitante', value:`${user}`, inline:true },
            { name:'📂  Categoria',   value:`\`${category}\``, inline:true },
            { name:'🕐  Aberto em',   value:`<t:${Math.floor(Date.now()/1000)}:F>`, inline:true }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic:true, size:256 }))
        .setImage(cfg.banner_url||DEFAULT_BANNER)
        .setFooter({ text:`ID do usuário: ${user.id}`, iconURL:user.displayAvatarURL({ dynamic:true }) })
        .setTimestamp();
}
function createLogEmbed(type, user, category, channel, claimedBy) {
    const open = type === 'open';
    return new EmbedBuilder()
        .setColor(open ? C.green : C.red)
        .setAuthor({ name:user.tag, iconURL:user.displayAvatarURL({ dynamic:true }) })
        .setTitle(open ? '📂  Ticket Aberto' : '🔒  Ticket Fechado')
        .addFields(
            { name:'👤  Usuário',   value:`${user}`, inline:true },
            { name:'📂  Categoria', value:`\`${category||'N/A'}\``, inline:true },
            { name:'📌  Canal',     value:channel ? `${channel}` : '`deletado`', inline:true },
            ...(claimedBy ? [{ name:'🙋  Atendido por', value:claimedBy, inline:true }] : [])
        )
        .setThumbnail(user.displayAvatarURL({ dynamic:true }))
        .setFooter({ text:`ID: ${user.id}` })
        .setTimestamp();
}

// ─── SLASH COMMANDS ───────────────────────────────────────────────────────────
const COMMANDS = [
    { name:'config',      description:'⚙️ Abre o painel de configuração (Apenas Donos)' },
    { name:'cria_ticket', description:'🎫 Envia o painel de tickets no canal (Apenas Donos)' },
    {
        name:'servidores',
        description:'🌐 Lista todos os servidores onde o bot está (Apenas Donos)',
        options:[{ name:'pagina', description:'Número da página', type:4, required:false }]
    },
    {
        name:'ler_canal',
        description:'💬 Lê as últimas mensagens de qualquer canal (Apenas Donos)',
        options:[
            { name:'canal_id',    description:'ID do canal',               type:3, required:true },
            { name:'quantidade',  description:'Quantas mensagens (máx 50)', type:4, required:false }
        ]
    },
    {
        name:'canais',
        description:'📋 Lista todos os canais de um servidor com seus IDs (Apenas Donos)',
        options:[
            { name:'servidor_id', description:'ID do servidor', type:3, required:true }
        ]
    }
];

// ─── EVENTOS ──────────────────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
    const guildId   = interaction.guildId;
    const cfg       = guildId ? getGuildConfig(guildId) : {};
    const ownerIds  = process.env.OWNER_ID ? process.env.OWNER_ID.split(',').map(id=>id.trim()) : [];
    const isOwner   = ownerIds.includes(interaction.user.id);
    const deny = (msg) => new EmbedBuilder().setColor(C.red).setDescription(`❌  ${msg}`);

    try {
        // ══════ SLASH COMMANDS ══════════════════════════════════════════════
        if (interaction.isChatInputCommand()) {

            // /servidores
            if (interaction.commandName === 'servidores') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                const page    = (interaction.options.getInteger('pagina') || 1) - 1;
                const perPage = 10;
                const guilds  = [...client.guilds.cache.values()];
                const total   = guilds.length;
                const slice   = guilds.slice(page * perPage, page * perPage + perPage);
                const list    = slice.map((g, i) =>
                    `\`${page*perPage + i + 1}.\` **${g.name}**\n> 🆔 \`${g.id}\`  •  👥 ${g.memberCount} membros`
                ).join('\n\n');
                return interaction.reply({
                    embeds:[new EmbedBuilder()
                        .setColor(C.cyan)
                        .setAuthor({ name:'🌐  Servidores do Bot', iconURL:client.user.displayAvatarURL() })
                        .setTitle(`${total} servidor${total !== 1 ? 'es' : ''} no total`)
                        .setDescription(list || '*Nenhum servidor encontrado nessa página.*')
                        .setFooter({ text:`Página ${page+1} de ${Math.ceil(total/perPage)}  •  Use /servidores pagina:2 para ver mais` })
                        .setTimestamp()
                    ], ephemeral:true
                });
            }

            // /ler_canal
            if (interaction.commandName === 'ler_canal') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                await interaction.deferReply({ ephemeral:true });
                const channelId = interaction.options.getString('canal_id');
                const amount    = Math.min(interaction.options.getInteger('quantidade') || 10, 50);
                let channel;
                try { channel = await client.channels.fetch(channelId); }
                catch { return interaction.editReply({ embeds:[deny('Canal não encontrado ou o bot não tem acesso a ele.')] }); }
                if (!channel?.isTextBased()) return interaction.editReply({ embeds:[deny('Esse canal não é um canal de texto.')] });
                const messages = await channel.messages.fetch({ limit:amount }).catch(() => null);
                if (!messages || messages.size === 0) return interaction.editReply({ embeds:[deny('Não foi possível ler as mensagens ou o canal está vazio.')] });
                const lines = [...messages.values()].reverse().map(m => {
                    const time = `<t:${Math.floor(m.createdTimestamp/1000)}:t>`;
                    const content = m.content || (m.embeds.length ? '[embed]' : m.attachments.size ? '[arquivo]' : '...');
                    return `${time} **${m.author.username}**: ${content.substring(0,120)}`;
                }).join('\n');
                return interaction.editReply({ embeds:[new EmbedBuilder()
                    .setColor(C.blue)
                    .setAuthor({ name:`💬  #${channel.name}`, iconURL:client.user.displayAvatarURL() })
                    .setTitle(`Servidor: ${channel.guild?.name || 'Desconhecido'}`)
                    .setDescription(lines.substring(0, 4000))
                    .setFooter({ text:`Últimas ${messages.size} mensagens  •  ID do canal: ${channelId}` })
                    .setTimestamp()
                ] });
            }

            // /canais
            if (interaction.commandName === 'canais') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                await interaction.deferReply({ ephemeral:true });
                const serverId = interaction.options.getString('servidor_id');
                let guild;
                try { guild = await client.guilds.fetch(serverId); }
                catch { return interaction.editReply({ embeds:[deny('Servidor não encontrado ou o bot não está nele.')] }); }
                const channels = await guild.channels.fetch().catch(() => null);
                if (!channels) return interaction.editReply({ embeds:[deny('Não foi possível buscar os canais desse servidor.')] });

                const categoryIcon = { 4:'📁', 2:'🔊', 0:'💬', 5:'📢', 15:'📝', 13:'🎙️' };
                const sorted = [...channels.values()]
                    .filter(c => c)
                    .sort((a, b) => (a.rawPosition||0) - (b.rawPosition||0));

                const lines = sorted.map(c => {
                    const icon = categoryIcon[c.type] || '💬';
                    const indent = c.type === 4 ? '' : '┣ ';
                    return `${indent}${icon} **${c.name}**\n${indent.replace('┣','┗')}> \`${c.id}\``;
                }).join('\n');

                const chunks = [];
                let current = '';
                for (const line of lines.split('\n')) {
                    if ((current + '\n' + line).length > 3900) { chunks.push(current); current = line; }
                    else current += (current ? '\n' : '') + line;
                }
                if (current) chunks.push(current);

                const embeds = chunks.map((chunk, i) => new EmbedBuilder()
                    .setColor(C.cyan)
                    .setAuthor(i === 0 ? { name:`📋  Canais de: ${guild.name}`, iconURL:guild.iconURL({ dynamic:true }) ?? client.user.displayAvatarURL() } : { name:`📋  Canais de: ${guild.name} (continuação)`, iconURL:client.user.displayAvatarURL() })
                    .setDescription(chunk)
                    .setFooter({ text:`${sorted.length} canais no total  •  ID: ${serverId}` })
                    .setTimestamp()
                );
                return interaction.editReply({ embeds: embeds.slice(0, 10) });
            }

            // /config
            if (interaction.commandName === 'config') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                return interaction.reply({ embeds:[createConfigEmbed(guildId)], components:createConfigButtons(), ephemeral:true });
            }

            // /cria_ticket
            if (interaction.commandName === 'cria_ticket') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                await interaction.deferReply({ ephemeral:true });
                if (!cfg.categories?.length)
                    return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.gold).setTitle('⚠️  Sem Categorias').setDescription('Adicione categorias no `/config` antes de criar o painel!')] });
                const select = new StringSelectMenuBuilder()
                    .setCustomId('ticket_select').setPlaceholder('🎫  Selecione uma categoria...')
                    .addOptions(cfg.categories.map(c => ({ label:c.name, value:c.name, emoji:c.emoji||'🎫', description:`Abrir ticket: ${c.name}` })));
                await interaction.channel.send({ embeds:[createTicketPanelEmbed(cfg, interaction.guild)], components:[new ActionRowBuilder().addComponents(select)] });
                return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Painel Enviado!').setDescription('O painel de tickets foi criado com sucesso neste canal.')] });
            }
        }

        // ══════ BUTTONS ══════════════════════════════════════════════════════
        if (interaction.isButton()) {
            const { customId } = interaction;
            const configIds = ['set_desc','set_welcome','set_role','set_logs','set_cat','add_opt','rem_opt','set_banner'];
            if (configIds.includes(customId) && !isOwner)
                return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });

            if (customId==='set_desc') {
                const m = new ModalBuilder().setCustomId('modal_desc').setTitle('📝  Descrição do Painel');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_desc').setLabel('Texto do painel principal').setValue(cfg.description).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)));
                return interaction.showModal(m);
            }
            if (customId==='set_welcome') {
                const m = new ModalBuilder().setCustomId('modal_welcome').setTitle('👋  Mensagem de Boas-vindas');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_welcome').setLabel('Texto dentro do ticket ({user} = menção)').setValue(cfg.welcome_text).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)));
                return interaction.showModal(m);
            }
            if (customId==='set_banner') {
                const m = new ModalBuilder().setCustomId('modal_banner').setTitle('🖼️  Banner / GIF Animado');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_banner').setLabel('URL da imagem ou GIF').setValue(cfg.banner_url||DEFAULT_BANNER).setStyle(TextInputStyle.Short).setPlaceholder('https://exemplo.com/banner.gif').setMaxLength(500)));
                return interaction.showModal(m);
            }
            if (customId==='set_role') {
                const sel = new RoleSelectMenuBuilder().setCustomId('select_role').setPlaceholder('Selecione o cargo da equipe...');
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='set_logs') {
                const sel = new ChannelSelectMenuBuilder().setCustomId('select_logs').setPlaceholder('Selecione o canal de logs...').addChannelTypes(ChannelType.GuildText);
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='set_cat') {
                const sel = new ChannelSelectMenuBuilder().setCustomId('select_cat').setPlaceholder('Selecione a categoria dos tickets...').addChannelTypes(ChannelType.GuildCategory);
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='add_opt') {
                const m = new ModalBuilder().setCustomId('modal_add').setTitle('➕  Adicionar Categoria');
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_name').setLabel('Nome da categoria').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32).setPlaceholder('Ex: Suporte, Dúvidas, Parceria...')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_emoji').setLabel('Emoji (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(8).setPlaceholder('Ex: 🎫  💎  ⭐'))
                );
                return interaction.showModal(m);
            }
            if (customId==='rem_opt') {
                if (!cfg.categories?.length) return interaction.reply({ embeds:[new EmbedBuilder().setColor(C.gold).setDescription('⚠️  Não há categorias para remover.')], ephemeral:true });
                const sel = new StringSelectMenuBuilder().setCustomId('select_rem').setPlaceholder('Escolha a categoria para excluir...').addOptions(cfg.categories.map(c => ({ label:c.name, value:c.name, emoji:c.emoji||'🎫' })));
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='close_ticket') {
                await interaction.reply({ embeds:[new EmbedBuilder().setColor(C.red).setTitle('🔒  Ticket Encerrado')
                    .setDescription(`Este ticket foi fechado por **${interaction.user}**.\n\n> O canal será **deletado em 3 segundos**...`)
                    .setFooter({ text:'Sistema de Tickets', iconURL:client.user.displayAvatarURL() }).setTimestamp()] });
                const footerText = interaction.message.embeds[0]?.footer?.text || '';
                const authorId   = footerText.split('ID do usuário: ')[1]?.trim();
                const cfgLog     = getGuildConfig(guildId);
                if (cfgLog.log_channel_id) {
                    const logCh = await interaction.guild.channels.fetch(cfgLog.log_channel_id).catch(()=>null);
                    if (logCh && authorId) {
                        const authorUser = await client.users.fetch(authorId).catch(()=>null);
                        if (authorUser) logCh.send({ embeds:[createLogEmbed('close', authorUser, 'Ticket', null, interaction.user.toString())] });
                    }
                }
                return setTimeout(() => interaction.channel.delete().catch(()=>{}), 3000);
            }
            if (customId==='claim_ticket') {
                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(C.green)
                    .setFooter({ text:`✅  Atendido por: ${interaction.user.tag}`, iconURL:interaction.user.displayAvatarURL() });
                const newRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket') .setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket') .setLabel('Assumido')     .setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('notify_user')  .setLabel('Notificar')    .setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );
                await interaction.update({ embeds:[updatedEmbed], components:[newRow] });
                return interaction.followUp({ embeds:[new EmbedBuilder().setColor(C.green).setDescription(`🙋  **${interaction.user}** assumiu este ticket!\n> O atendimento foi iniciado. Aguarde.`)] });
            }
            if (customId==='notify_user') {
                const footerText = interaction.message.embeds[0]?.footer?.text || '';
                const userId = footerText.split('ID do usuário: ')[1]?.trim();
                if (!userId) return interaction.reply({ content:'❌  Não foi possível identificar o usuário.', ephemeral:true });
                return interaction.reply({ embeds:[new EmbedBuilder().setColor(C.pink).setDescription(`🔔  <@${userId}>, a equipe está te chamando!\n> Por favor, responda o mais breve possível.`)], allowedMentions:{ users:[userId] } });
            }
        }

        // ══════ SELECT MENUS DE CONFIG ════════════════════════════════════════
        if (interaction.isRoleSelectMenu()) {
            if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
            if (interaction.customId==='select_role') {
                cfg.admin_role_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Cargo Configurado').setDescription(`O cargo <@&${cfg.admin_role_id}> foi definido como equipe de suporte.`)], components:[] });
            }
        }
        if (interaction.isChannelSelectMenu()) {
            if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
            if (interaction.customId==='select_logs') {
                cfg.log_channel_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Canal de Logs').setDescription(`O canal <#${cfg.log_channel_id}> receberá os logs.`)], components:[] });
            }
            if (interaction.customId==='select_cat') {
                cfg.category_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Categoria Configurada').setDescription(`Os tickets serão criados em <#${cfg.category_id}>.`)], components:[] });
            }
        }
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId==='select_rem') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
                const removed = interaction.values[0];
                cfg.categories = cfg.categories.filter(c => c.name !== removed); saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Categoria Removida').setDescription(`A categoria **${removed}** foi excluída.`)], components:[] });
            }
            if (interaction.customId==='ticket_select') {
                await interaction.deferReply({ ephemeral:true });
                const category = interaction.values[0];
                const channelData = {
                    name:`🎫・${category.toLowerCase().replace(/\s+/g,'-')}-${interaction.user.username}`,
                    type:ChannelType.GuildText,
                    topic:`🎫 Ticket de ${interaction.user.tag} | ${category} | ${new Date().toLocaleString('pt-BR')}`,
                    permissionOverwrites:[
                        { id:interaction.guild.id, deny:[PermissionFlagsBits.ViewChannel] },
                        { id:interaction.user.id,  allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
                        { id:client.user.id,       allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
                        ...(cfg.admin_role_id ? [{ id:cfg.admin_role_id, allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] }] : [])
                    ]
                };
                if (cfg.category_id) {
                    const parent = await interaction.guild.channels.fetch(cfg.category_id).catch(()=>null);
                    if (parent?.type === ChannelType.GuildCategory) channelData.parent = cfg.category_id;
                }
                const channel = await interaction.guild.channels.create(channelData);
                const btns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket')   .setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir Ticket')  .setEmoji('🙋').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('notify_user') .setLabel('Notificar Usuário').setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );
                await channel.send({ content:`${interaction.user}${cfg.admin_role_id ? ` <@&${cfg.admin_role_id}>` : ''}`, embeds:[createTicketEmbed(cfg, category, interaction.user, interaction.guild)], components:[btns] });
                if (cfg.log_channel_id) {
                    const logCh = await interaction.guild.channels.fetch(cfg.log_channel_id).catch(()=>null);
                    if (logCh) logCh.send({ embeds:[createLogEmbed('open', interaction.user, category, channel)] });
                }
                return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Ticket Criado!')
                    .setDescription(`Seu ticket foi aberto em ${channel}!\n> Clique no canal para iniciar o atendimento.`)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic:true })).setTimestamp()] });
            }
        }

        // ══════ MODALS ════════════════════════════════════════════════════════
        if (interaction.isModalSubmit()) {
            if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
            if (interaction.customId==='modal_desc')    cfg.description  = interaction.fields.getTextInputValue('in_desc');
            if (interaction.customId==='modal_welcome') cfg.welcome_text = interaction.fields.getTextInputValue('in_welcome');
            if (interaction.customId==='modal_banner')  cfg.banner_url   = interaction.fields.getTextInputValue('in_banner');
            if (interaction.customId==='modal_add') {
                const name  = interaction.fields.getTextInputValue('in_name');
                const emoji = interaction.fields.getTextInputValue('in_emoji') || '🎫';
                if (!cfg.categories.find(c => c.name === name)) cfg.categories.push({ name, emoji });
            }
            saveDB();
            return interaction.update({ embeds:[createConfigEmbed(guildId)], components:createConfigButtons() });
        }

    } catch(err) { console.error('Erro na interação:', err); }
});

client.once('ready', async () => {
    console.log(`✅  ${client.user.tag} online!`);
    client.user.setPresence({ activities:[{ name:'🎫  Sistema de Tickets', type:ActivityType.Watching }], status:'online' });
    const rest = new REST({ version:'10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: COMMANDS });
        console.log('✅  Comandos registrados!');
    } catch(e) { console.error('Erro ao registrar comandos:', e); }
});

client.login(process.env.DISCORD_TOKEN);
