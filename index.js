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

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
});

const CONFIG_PATH    = './database.json';
const DEFAULT_BANNER = 'https://raw.githubusercontent.com/elias39824/Bot-de-ticket-teste/main/banner.png';

// Armazena formulários em progresso: userId -> { step, answers, guildId }
const staffApps = new Map();

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
        banner_url:DEFAULT_BANNER, categories:[],
        staff_review_role_id:null, staff_category_id:null
    };
    if (!db[guildId].banner_url) db[guildId].banner_url = DEFAULT_BANNER;
    if (!db[guildId].staff_review_role_id) db[guildId].staff_review_role_id = null;
    if (!db[guildId].staff_category_id)    db[guildId].staff_category_id    = null;
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
            { name:'👮 Cargo Equipe',       value:cfg.admin_role_id           ? `<@&${cfg.admin_role_id}>`           : '`Não definido`', inline:true },
            { name:'📜 Canal de Logs',      value:cfg.log_channel_id          ? `<#${cfg.log_channel_id}>`           : '`Não definido`', inline:true },
            { name:'📁 Categoria Tickets',  value:cfg.category_id             ? `<#${cfg.category_id}>`              : '`Não definida`', inline:true },
            { name:'🖼️ Banner',             value:cfg.banner_url ? `[🔗 Ver](${cfg.banner_url})` : '`Não definido`', inline:true },
            { name:'👑 Cargo Revisão Staff',value:cfg.staff_review_role_id    ? `<@&${cfg.staff_review_role_id}>`    : '`Não definido`', inline:true },
            { name:'📂 Categoria Formulários',value:cfg.staff_category_id     ? `<#${cfg.staff_category_id}>`        : '`Não definida`', inline:true },
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
            new ButtonBuilder().setCustomId('set_desc')         .setLabel('Descrição')       .setEmoji('📝').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_welcome')      .setLabel('Boas-vindas')     .setEmoji('👋').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_role')         .setLabel('Cargo Equipe')    .setEmoji('👮').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_banner')       .setLabel('Banner/GIF')      .setEmoji('🖼️').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('set_logs')         .setLabel('Canal Logs')           .setEmoji('📜').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_cat')          .setLabel('Categ. Tickets')        .setEmoji('📁').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('add_opt')          .setLabel('Add Categoria')         .setEmoji('➕').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('rem_opt')          .setLabel('Rem Categoria')         .setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('set_staff_role')   .setLabel('Cargo Revisão Staff')   .setEmoji('👑').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('set_staff_cat')    .setLabel('Categ. Formulários')    .setEmoji('📂').setStyle(ButtonStyle.Secondary)
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

// ─── FORMULÁRIO DE STAFF ──────────────────────────────────────────────────────
function buildStaffResultEmbed(user, answers) {
    const [q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14] = answers;
    return new EmbedBuilder()
        .setColor(C.purple)
        .setAuthor({ name:`📋  Formulário de Staff — EH NIGHT WORLD`, iconURL:client.user.displayAvatarURL() })
        .setTitle(`Candidato: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic:true, size:256 }))
        .setDescription(`${STAR} ${DIV} ${STAR}\n> Candidatura recebida em <t:${Math.floor(Date.now()/1000)}:F>\n${STAR} ${DIV} ${STAR}`)
        .addFields(
            { name:'1️⃣  Nome no Roblox',           value:`> ${q1||'—'}`, inline:false },
            { name:'2️⃣  Idade',                     value:`> ${q2||'—'}`, inline:true  },
            { name:'3️⃣  Usuário do Discord',        value:`> ${q3||'—'}`, inline:true  },
            { name:'4️⃣  Tempo de jogo por dia',     value:`> ${q4||'—'}`, inline:false },
            { name:'5️⃣  Foi staff antes?',          value:`> ${q5||'—'}`, inline:false },
            { name:'6️⃣  Por que quer ser staff?',   value:`> ${q6||'—'}`, inline:false },
            { name:'7️⃣  Jogador quebrando regras',  value:`> ${q7||'—'}`, inline:false },
            { name:'8️⃣  Jogador tóxico/ofensivo',   value:`> ${q8||'—'}`, inline:false },
            { name:'9️⃣  Trabalho em equipe',        value:`> ${q9||'—'}`, inline:false },
            { name:'🔟  Responsabilidade (0-10)',    value:`> ${q10||'—'}`, inline:false },
            { name:'1️⃣1️⃣  Conhece as regras?',    value:`> ${q11||'—'}`, inline:true  },
            { name:'1️⃣2️⃣  Aceita as regras?',      value:`> ${q12||'—'}`, inline:true  },
            { name:'1️⃣3️⃣  Horários disponíveis',   value:`> ${q13||'—'}`, inline:false },
            { name:'1️⃣4️⃣  Informação extra',       value:`> ${q14||'—'}`, inline:false }
        )
        .setFooter({ text:`ID do candidato: ${user.id}` })
        .setTimestamp();
}

// ─── LEITOR DE MENSAGENS ──────────────────────────────────────────────────────
async function buildMsgViewer(channel, opts = {}) {
    const { before, after, filtro } = opts;
    const fetchOpts = { limit: 50 };
    if (before) fetchOpts.before = before;
    if (after)  fetchOpts.after  = after;
    const messages = await channel.messages.fetch(fetchOpts).catch(() => null);
    if (!messages || messages.size === 0) return null;
    let lista = [...messages.values()].reverse();
    if (filtro) {
        lista = lista.filter(m => {
            const ehDoUser     = m.author.username.toLowerCase().includes(filtro);
            const mencionaUser = m.content.toLowerCase().includes(filtro) ||
                [...m.mentions.users.values()].some(u => u.username.toLowerCase().includes(filtro));
            return ehDoUser || mencionaUser;
        });
    }
    if (lista.length === 0) return null;
    const oldestId = lista[0].id;
    const newestId = lista[lista.length - 1].id;
    const f = filtro || '';
    const lines = lista.map(m => {
        const time    = `<t:${Math.floor(m.createdTimestamp/1000)}:t>`;
        const content = m.content || (m.embeds.length ? '*[embed]*' : m.attachments.size ? '*[arquivo]*' : '*...*');
        const tag     = filtro && !m.author.username.toLowerCase().includes(filtro) ? ' *(menção)*' : '';
        return `${time} **${m.author.username}**${tag}: ${content.substring(0, 180)}`;
    }).join('\n');
    const embed = new EmbedBuilder()
        .setColor(C.blue)
        .setAuthor({ name:`#${channel.name}  •  ${channel.guild?.name || '?'}`, iconURL:client.user.displayAvatarURL() })
        .setTitle(filtro ? `🔍  Filtro: "${filtro}"` : `💬  Mensagens do Canal`)
        .setDescription(lines.substring(0, 4000))
        .setFooter({ text:`${lista.length} mensagem(ns)  •  Use os botões para navegar` })
        .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`msg_older:${channel.id}:${oldestId}:${f}`).setLabel('⬆️  Mais Antigas') .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`msg_refresh:${channel.id}::${f}`)         .setLabel('🔄  Atualizar')    .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`msg_newer:${channel.id}:${newestId}:${f}`).setLabel('⬇️  Mais Recentes').setStyle(ButtonStyle.Secondary)
    );
    return { embed, row };
}

// ─── SLASH COMMANDS ───────────────────────────────────────────────────────────
const COMMANDS = [
    { name:'config',       description:'⚙️ Abre o painel de configuração (Apenas Donos)' },
    { name:'cria_ticket',  description:'🎫 Envia o painel de tickets no canal (Apenas Donos)' },
    { name:'formulario',   description:'📋 Abrir formulário para se candidatar a Staff do EH NIGHT WORLD' },
    {
        name:'servidores',
        description:'🌐 Lista todos os servidores onde o bot está (Apenas Donos)',
        options:[{ name:'pagina', description:'Número da página', type:4, required:false }]
    },
    {
        name:'ler_canal',
        description:'💬 Lê as últimas mensagens de qualquer canal (Apenas Donos)',
        options:[
            { name:'canal_id',   description:'ID do canal',                            type:3, required:true  },
            { name:'quantidade', description:'Quantas mensagens para buscar (máx 100)', type:4, required:false },
            { name:'usuario',    description:'Filtrar por nome de usuário',             type:3, required:false }
        ]
    },
    {
        name:'canais',
        description:'📋 Lista todos os canais de um servidor com seus IDs (Apenas Donos)',
        options:[{ name:'servidor_id', description:'ID do servidor', type:3, required:true }]
    }
];

// ─── EVENTOS ──────────────────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
    const guildId  = interaction.guildId;
    const cfg      = guildId ? getGuildConfig(guildId) : {};
    const ownerIds = process.env.OWNER_ID ? process.env.OWNER_ID.split(',').map(id=>id.trim()) : [];
    const isOwner  = ownerIds.includes(interaction.user.id);
    const deny = (msg) => new EmbedBuilder().setColor(C.red).setDescription(`❌  ${msg}`);

    try {
        // ══════ SLASH COMMANDS ══════════════════════════════════════════════
        if (interaction.isChatInputCommand()) {

            // /formulario
            if (interaction.commandName === 'formulario') {
                // Verifica se já tem formulário em progresso
                if (staffApps.has(interaction.user.id)) {
                    return interaction.reply({ embeds:[new EmbedBuilder().setColor(C.gold)
                        .setTitle('⚠️  Formulário em Progresso')
                        .setDescription('Você já tem um formulário aberto! Conclua-o antes de iniciar outro.')
                    ], ephemeral:true });
                }
                staffApps.set(interaction.user.id, { step:1, answers:[], guildId });
                const modal = new ModalBuilder().setCustomId('staff_form_1').setTitle('📋 Formulário Staff — Parte 1/3');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s1').setLabel('1. Nome de usuário no Roblox').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Seu nick no Roblox...')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s2').setLabel('2. Idade').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 16')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s3').setLabel('3. Usuário do Discord').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: mtzinyz')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s4').setLabel('4. Tempo de jogo por dia').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Menos de 1h / 1-3h / 3-5h / Mais de 5h')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s5').setLabel('5. Já foi staff antes? Se sim, qual?').setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('Descreva sua experiência anterior...')),
                );
                return interaction.showModal(modal);
            }

            // /servidores
            if (interaction.commandName === 'servidores') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                const page    = (interaction.options.getInteger('pagina') || 1) - 1;
                const perPage = 10;
                const guilds  = [...client.guilds.cache.values()];
                const total   = guilds.length;
                const slice   = guilds.slice(page*perPage, page*perPage+perPage);
                const list    = slice.map((g,i) => `\`${page*perPage+i+1}.\` **${g.name}**\n> 🆔 \`${g.id}\`  •  👥 ${g.memberCount} membros`).join('\n\n');
                return interaction.reply({ embeds:[new EmbedBuilder()
                    .setColor(C.cyan).setAuthor({ name:'🌐  Servidores do Bot', iconURL:client.user.displayAvatarURL() })
                    .setTitle(`${total} servidor${total!==1?'es':''} no total`)
                    .setDescription(list||'*Nenhum.*')
                    .setFooter({ text:`Página ${page+1} de ${Math.ceil(total/perPage)}  •  Use /servidores pagina:2 para mais` })
                    .setTimestamp()
                ], ephemeral:true });
            }

            // /ler_canal
            if (interaction.commandName === 'ler_canal') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                await interaction.deferReply({ ephemeral:true });
                const channelId  = interaction.options.getString('canal_id');
                const filtroUser = interaction.options.getString('usuario')?.toLowerCase().trim() || '';
                let channel;
                try { channel = await client.channels.fetch(channelId); }
                catch { return interaction.editReply({ embeds:[deny('Canal não encontrado ou o bot não tem acesso.')] }); }
                if (!channel?.isTextBased()) return interaction.editReply({ embeds:[deny('Esse canal não é de texto.')] });
                const result = await buildMsgViewer(channel, { filtro:filtroUser });
                if (!result) return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.gold).setTitle('⚠️  Nenhuma mensagem encontrada').setDescription('O canal está vazio ou não há mensagens com esse filtro.')] });
                return interaction.editReply({ embeds:[result.embed], components:[result.row] });
            }

            // /canais
            if (interaction.commandName === 'canais') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                await interaction.deferReply({ ephemeral:true });
                const serverId = interaction.options.getString('servidor_id');
                let guild;
                try { guild = await client.guilds.fetch(serverId); }
                catch { return interaction.editReply({ embeds:[deny('Servidor não encontrado ou o bot não está nele.')] }); }
                const channels = await guild.channels.fetch().catch(()=>null);
                if (!channels) return interaction.editReply({ embeds:[deny('Não foi possível buscar os canais.')] });
                const catIcon = { 4:'📁',2:'🔊',0:'💬',5:'📢',15:'📝',13:'🎙️' };
                const sorted  = [...channels.values()].filter(c=>c).sort((a,b)=>(a.rawPosition||0)-(b.rawPosition||0));
                const lines   = sorted.map(c => `${c.type===4?'':'┣ '}${catIcon[c.type]||'💬'} **${c.name}**\n${c.type===4?'':'┗ '}> \`${c.id}\``).join('\n');
                const chunks  = [];
                let cur = '';
                for (const line of lines.split('\n')) {
                    if ((cur+'\n'+line).length > 3900) { chunks.push(cur); cur = line; }
                    else cur += (cur?'\n':'')+line;
                }
                if (cur) chunks.push(cur);
                return interaction.editReply({ embeds: chunks.slice(0,10).map((chunk,i) => new EmbedBuilder()
                    .setColor(C.cyan)
                    .setAuthor({ name:i===0?`📋  Canais de: ${guild.name}`:`📋  Canais de: ${guild.name} (cont.)`, iconURL:guild.iconURL({ dynamic:true })??client.user.displayAvatarURL() })
                    .setDescription(chunk)
                    .setFooter({ text:`${sorted.length} canais  •  ID: ${serverId}` })
                    .setTimestamp()
                )});
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
                if (!cfg.categories?.length) return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.gold).setTitle('⚠️  Sem Categorias').setDescription('Adicione categorias no `/config` antes!')] });
                const select = new StringSelectMenuBuilder()
                    .setCustomId('ticket_select').setPlaceholder('🎫  Selecione uma categoria...')
                    .addOptions(cfg.categories.map(c=>({ label:c.name, value:c.name, emoji:c.emoji||'🎫', description:`Abrir ticket: ${c.name}` })));
                await interaction.channel.send({ embeds:[createTicketPanelEmbed(cfg, interaction.guild)], components:[new ActionRowBuilder().addComponents(select)] });
                return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Painel Enviado!')] });
            }
        }

        // ══════ BUTTONS ══════════════════════════════════════════════════════
        if (interaction.isButton()) {
            const { customId } = interaction;
            const configIds = ['set_desc','set_welcome','set_role','set_logs','set_cat','add_opt','rem_opt','set_banner','set_staff_role','set_staff_cat'];
            if (configIds.includes(customId) && !isOwner)
                return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });

            if (customId==='set_desc') {
                const m = new ModalBuilder().setCustomId('modal_desc').setTitle('📝  Descrição do Painel');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_desc').setLabel('Texto do painel').setValue(cfg.description).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)));
                return interaction.showModal(m);
            }
            if (customId==='set_welcome') {
                const m = new ModalBuilder().setCustomId('modal_welcome').setTitle('👋  Mensagem de Boas-vindas');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_welcome').setLabel('Texto dentro do ticket ({user} = menção)').setValue(cfg.welcome_text).setStyle(TextInputStyle.Paragraph).setMaxLength(1000)));
                return interaction.showModal(m);
            }
            if (customId==='set_banner') {
                const m = new ModalBuilder().setCustomId('modal_banner').setTitle('🖼️  Banner / GIF Animado');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_banner').setLabel('URL da imagem ou GIF').setValue(cfg.banner_url||DEFAULT_BANNER).setStyle(TextInputStyle.Short).setMaxLength(500)));
                return interaction.showModal(m);
            }
            if (customId==='set_role') {
                const sel = new RoleSelectMenuBuilder().setCustomId('select_role').setPlaceholder('Cargo da equipe de suporte...');
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='set_staff_role') {
                const sel = new RoleSelectMenuBuilder().setCustomId('select_staff_role').setPlaceholder('Cargo que revisa formulários de staff...');
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='set_logs') {
                const sel = new ChannelSelectMenuBuilder().setCustomId('select_logs').setPlaceholder('Canal de logs...').addChannelTypes(ChannelType.GuildText);
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='set_cat') {
                const sel = new ChannelSelectMenuBuilder().setCustomId('select_cat').setPlaceholder('Categoria dos tickets...').addChannelTypes(ChannelType.GuildCategory);
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='set_staff_cat') {
                const sel = new ChannelSelectMenuBuilder().setCustomId('select_staff_cat').setPlaceholder('Categoria para formulários de staff...').addChannelTypes(ChannelType.GuildCategory);
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }
            if (customId==='add_opt') {
                const m = new ModalBuilder().setCustomId('modal_add').setTitle('➕  Adicionar Categoria');
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_name').setLabel('Nome da categoria').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32).setPlaceholder('Ex: Suporte, Dúvidas...')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_emoji').setLabel('Emoji (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(8).setPlaceholder('Ex: 🎫  💎  ⭐'))
                );
                return interaction.showModal(m);
            }
            if (customId==='rem_opt') {
                if (!cfg.categories?.length) return interaction.reply({ embeds:[new EmbedBuilder().setColor(C.gold).setDescription('⚠️  Não há categorias para remover.')], ephemeral:true });
                const sel = new StringSelectMenuBuilder().setCustomId('select_rem').setPlaceholder('Categoria para excluir...').addOptions(cfg.categories.map(c=>({ label:c.name, value:c.name, emoji:c.emoji||'🎫' })));
                return interaction.reply({ components:[new ActionRowBuilder().addComponents(sel)], ephemeral:true });
            }

            // ── Navegação de mensagens ──
            if (customId.startsWith('msg_refresh:') || customId.startsWith('msg_older:') || customId.startsWith('msg_newer:')) {
                if (!isOwner) return interaction.reply({ embeds:[deny('Apenas donos autorizados.')], ephemeral:true });
                await interaction.deferUpdate();
                const parts     = customId.split(':');
                const tipo      = parts[0];
                const channelId = parts[1];
                const pivotId   = parts[2] || '';
                const filtro    = parts[3] || '';
                let channel;
                try { channel = await client.channels.fetch(channelId); }
                catch { return interaction.editReply({ embeds:[deny('Canal inacessível.')], components:[] }); }
                const opts = { filtro };
                if (tipo==='msg_older' && pivotId) opts.before = pivotId;
                if (tipo==='msg_newer' && pivotId) opts.after  = pivotId;
                const result = await buildMsgViewer(channel, opts);
                if (!result) {
                    const msg = tipo==='msg_older' ? 'Não há mensagens mais antigas.' : 'Não há mensagens mais recentes.';
                    return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.gold).setDescription(`⚠️  ${msg}`)], components:interaction.message.components });
                }
                return interaction.editReply({ embeds:[result.embed], components:[result.row] });
            }

            // ── Aprovação de formulário staff ──
            if (customId.startsWith('staff_approve:') || customId.startsWith('staff_reject:')) {
                if (!isOwner && !(cfg.staff_review_role_id && interaction.member?.roles?.cache?.has(cfg.staff_review_role_id)))
                    return interaction.reply({ embeds:[deny('Apenas donos ou cargo de revisão podem fazer isso.')], ephemeral:true });
                const parts    = customId.split(':');
                const decisao  = parts[0]; // staff_approve ou staff_reject
                const userId   = parts[1];
                const aprovado = decisao === 'staff_approve';
                await interaction.reply({ embeds:[new EmbedBuilder()
                    .setColor(aprovado ? C.green : C.red)
                    .setTitle(aprovado ? '✅  Candidatura Aprovada!' : '❌  Candidatura Reprovada')
                    .setDescription(`A candidatura de <@${userId}> foi **${aprovado?'APROVADA':'REPROVADA'}** por ${interaction.user}.`)
                    .setTimestamp()
                ]});
                // Tenta enviar DM ao candidato
                try {
                    const candidato = await client.users.fetch(userId);
                    await candidato.send({ embeds:[new EmbedBuilder()
                        .setColor(aprovado ? C.green : C.red)
                        .setAuthor({ name:'EH NIGHT WORLD', iconURL:client.user.displayAvatarURL() })
                        .setTitle(aprovado ? '🎉  Parabéns! Candidatura Aprovada!' : '😔  Candidatura Reprovada')
                        .setDescription(aprovado
                            ? `Sua candidatura para **Staff do EH NIGHT WORLD** foi **aprovada**! 🎉\n\nEm breve a equipe entrará em contato com você. Bem-vindo ao time!`
                            : `Sua candidatura para **Staff do EH NIGHT WORLD** foi reprovada desta vez.\n\nNão desanime! Continue participando do servidor e tente novamente no futuro. 💪`
                        )
                        .setFooter({ text:'EH NIGHT WORLD  •  Sistema de Staff' })
                        .setTimestamp()
                    ]});
                } catch { /* DM fechada */ }
                // Desabilita os botões
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('staff_approve:done').setLabel('✅  Aprovado').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('staff_reject:done') .setLabel('❌  Reprovado').setStyle(ButtonStyle.Danger) .setDisabled(true)
                );
                await interaction.message.edit({ components:[disabledRow] });
                // Deleta o canal de revisão em 10 segundos
                setTimeout(() => interaction.channel.delete().catch(()=>{}), 10000);
                return;
            }

            // ── Ticket ──
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
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket') .setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumido')      .setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('notify_user') .setLabel('Notificar')     .setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );
                await interaction.update({ embeds:[updatedEmbed], components:[newRow] });
                return interaction.followUp({ embeds:[new EmbedBuilder().setColor(C.green).setDescription(`🙋  **${interaction.user}** assumiu este ticket!`)] });
            }
            if (customId==='notify_user') {
                const footerText = interaction.message.embeds[0]?.footer?.text || '';
                const userId = footerText.split('ID do usuário: ')[1]?.trim();
                if (!userId) return interaction.reply({ content:'❌  Não foi possível identificar o usuário.', ephemeral:true });
                return interaction.reply({ embeds:[new EmbedBuilder().setColor(C.pink).setDescription(`🔔  <@${userId}>, a equipe está te chamando!\n> Por favor, responda o mais breve possível.`)], allowedMentions:{ users:[userId] } });
            }
        }

        // ══════ SELECT MENUS ══════════════════════════════════════════════════
        if (interaction.isRoleSelectMenu()) {
            if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
            if (interaction.customId==='select_role') {
                cfg.admin_role_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Cargo Configurado').setDescription(`<@&${cfg.admin_role_id}> definido como equipe de suporte.`)], components:[] });
            }
            if (interaction.customId==='select_staff_role') {
                cfg.staff_review_role_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Cargo de Revisão Configurado').setDescription(`<@&${cfg.staff_review_role_id}> irá revisar os formulários de staff.`)], components:[] });
            }
        }
        if (interaction.isChannelSelectMenu()) {
            if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
            if (interaction.customId==='select_logs') {
                cfg.log_channel_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Canal de Logs').setDescription(`<#${cfg.log_channel_id}> receberá os logs.`)], components:[] });
            }
            if (interaction.customId==='select_cat') {
                cfg.category_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Categoria Configurada').setDescription(`Tickets serão criados em <#${cfg.category_id}>.`)], components:[] });
            }
            if (interaction.customId==='select_staff_cat') {
                cfg.staff_category_id = interaction.values[0]; saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Categoria de Formulários').setDescription(`Formulários de staff serão criados em <#${cfg.staff_category_id}>.`)], components:[] });
            }
        }
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId==='select_rem') {
                if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
                const removed = interaction.values[0];
                cfg.categories = cfg.categories.filter(c=>c.name!==removed); saveDB();
                return interaction.update({ embeds:[new EmbedBuilder().setColor(C.green).setTitle('✅  Categoria Removida').setDescription(`**${removed}** foi excluída.`)], components:[] });
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
                    if (parent?.type===ChannelType.GuildCategory) channelData.parent = cfg.category_id;
                }
                const channel = await interaction.guild.channels.create(channelData);
                const btns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket')    .setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Assumir Ticket')   .setEmoji('🙋').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('notify_user') .setLabel('Notificar Usuário').setEmoji('🔔').setStyle(ButtonStyle.Primary)
                );
                await channel.send({ content:`${interaction.user}${cfg.admin_role_id?` <@&${cfg.admin_role_id}>`:'' }`, embeds:[createTicketEmbed(cfg, category, interaction.user, interaction.guild)], components:[btns] });
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

            // ── Config modals ──
            if (['modal_desc','modal_welcome','modal_banner','modal_add'].includes(interaction.customId)) {
                if (!isOwner) return interaction.reply({ embeds:[deny('Acesso negado.')], ephemeral:true });
                if (interaction.customId==='modal_desc')    cfg.description  = interaction.fields.getTextInputValue('in_desc');
                if (interaction.customId==='modal_welcome') cfg.welcome_text = interaction.fields.getTextInputValue('in_welcome');
                if (interaction.customId==='modal_banner')  cfg.banner_url   = interaction.fields.getTextInputValue('in_banner');
                if (interaction.customId==='modal_add') {
                    const name  = interaction.fields.getTextInputValue('in_name');
                    const emoji = interaction.fields.getTextInputValue('in_emoji') || '🎫';
                    if (!cfg.categories.find(c=>c.name===name)) cfg.categories.push({ name, emoji });
                }
                saveDB();
                return interaction.update({ embeds:[createConfigEmbed(guildId)], components:createConfigButtons() });
            }

            // ── Staff form — Parte 1 ──
            if (interaction.customId === 'staff_form_1') {
                const app = staffApps.get(interaction.user.id) || { step:1, answers:[], guildId };
                app.answers[0] = interaction.fields.getTextInputValue('s1');
                app.answers[1] = interaction.fields.getTextInputValue('s2');
                app.answers[2] = interaction.fields.getTextInputValue('s3');
                app.answers[3] = interaction.fields.getTextInputValue('s4');
                app.answers[4] = interaction.fields.getTextInputValue('s5');
                staffApps.set(interaction.user.id, app);
                const modal2 = new ModalBuilder().setCustomId('staff_form_2').setTitle('📋 Formulário Staff — Parte 2/3');
                modal2.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s6').setLabel('6. Por que você quer ser staff?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s7').setLabel('7. O que faria com jogador quebrando regras?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s8').setLabel('8. Como lidaria com jogador tóxico/ofensivo?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s9').setLabel('9. Consegue trabalhar em equipe? Explique:').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s10').setLabel('10. Responsabilidade de 0 a 10. Por quê?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300))
                );
                return interaction.showModal(modal2);
            }

            // ── Staff form — Parte 2 ──
            if (interaction.customId === 'staff_form_2') {
                const app = staffApps.get(interaction.user.id);
                if (!app) return interaction.reply({ embeds:[deny('Sessão expirada. Use /formulario novamente.')], ephemeral:true });
                app.answers[5]  = interaction.fields.getTextInputValue('s6');
                app.answers[6]  = interaction.fields.getTextInputValue('s7');
                app.answers[7]  = interaction.fields.getTextInputValue('s8');
                app.answers[8]  = interaction.fields.getTextInputValue('s9');
                app.answers[9]  = interaction.fields.getTextInputValue('s10');
                staffApps.set(interaction.user.id, app);
                const modal3 = new ModalBuilder().setCustomId('staff_form_3').setTitle('📋 Formulário Staff — Parte 3/3');
                modal3.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s11').setLabel('11. Você conhece as regras do jogo?').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Sim / Não')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s12').setLabel('12. Você aceita seguir todas as regras?').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Sim / Não')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s13').setLabel('13. Horários disponíveis para ajudar').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300).setPlaceholder('Ex: Seg-Sex das 18h às 22h...')),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s14').setLabel('14. Alguma informação extra?').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500).setPlaceholder('Opcional...'))
                );
                return interaction.showModal(modal3);
            }

            // ── Staff form — Parte 3 (final) ──
            if (interaction.customId === 'staff_form_3') {
                const app = staffApps.get(interaction.user.id);
                if (!app) return interaction.reply({ embeds:[deny('Sessão expirada. Use /formulario novamente.')], ephemeral:true });
                app.answers[10] = interaction.fields.getTextInputValue('s11');
                app.answers[11] = interaction.fields.getTextInputValue('s12');
                app.answers[12] = interaction.fields.getTextInputValue('s13');
                app.answers[13] = interaction.fields.getTextInputValue('s14') || 'Nenhuma';
                staffApps.delete(interaction.user.id);

                await interaction.deferReply({ ephemeral:true });

                const reviewGuildId = app.guildId || guildId;
                const reviewCfg     = getGuildConfig(reviewGuildId);
                const guild         = client.guilds.cache.get(reviewGuildId);

                if (!guild) return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.gold).setTitle('⚠️  Formulário salvo mas sem servidor configurado').setDescription('O servidor de revisão não foi encontrado.')] });

                // Cria canal de revisão privado
                const channelData = {
                    name:`📋・form-${interaction.user.username}`,
                    type:ChannelType.GuildText,
                    topic:`Formulário de Staff de ${interaction.user.tag}`,
                    permissionOverwrites:[
                        { id:guild.id, deny:[PermissionFlagsBits.ViewChannel] },
                        { id:client.user.id, allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
                        ...(reviewCfg.admin_role_id       ? [{ id:reviewCfg.admin_role_id,       allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
                        ...(reviewCfg.staff_review_role_id ? [{ id:reviewCfg.staff_review_role_id, allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : [])
                    ]
                };
                if (reviewCfg.staff_category_id) {
                    const parent = await guild.channels.fetch(reviewCfg.staff_category_id).catch(()=>null);
                    if (parent?.type===ChannelType.GuildCategory) channelData.parent = reviewCfg.staff_category_id;
                }

                const reviewChannel = await guild.channels.create(channelData).catch(()=>null);
                if (!reviewChannel) return interaction.editReply({ embeds:[new EmbedBuilder().setColor(C.red).setTitle('❌  Erro ao criar canal').setDescription('Não foi possível criar o canal de revisão. Verifique as permissões do bot.')] });

                const btns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`staff_approve:${interaction.user.id}`).setLabel('✅  Aprovar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`staff_reject:${interaction.user.id}`) .setLabel('❌  Reprovar').setStyle(ButtonStyle.Danger)
                );

                const mentions = [
                    reviewCfg.admin_role_id        ? `<@&${reviewCfg.admin_role_id}>`        : '',
                    reviewCfg.staff_review_role_id  ? `<@&${reviewCfg.staff_review_role_id}>` : ''
                ].filter(Boolean).join(' ');

                await reviewChannel.send({
                    content: mentions || undefined,
                    embeds:[buildStaffResultEmbed(interaction.user, app.answers)],
                    components:[btns]
                });

                return interaction.editReply({ embeds:[new EmbedBuilder()
                    .setColor(C.green)
                    .setAuthor({ name:'EH NIGHT WORLD', iconURL:client.user.displayAvatarURL() })
                    .setTitle('✅  Formulário Enviado com Sucesso!')
                    .setDescription(`Sua candidatura para Staff foi recebida!\n\nA equipe irá analisar suas respostas e você receberá uma resposta via DM em breve.\n\n> 📬 Certifique-se de manter suas DMs abertas para receber o resultado!`)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic:true }))
                    .setTimestamp()
                ]});
            }
        }

    } catch(err) { console.error('Erro na interação:', err); }
});

client.once('ready', async () => {
    console.log(`✅  ${client.user.tag} online!`);
    client.user.setPresence({ activities:[{ name:'🎫  Sistema de Tickets', type:ActivityType.Watching }], status:'online' });
    const rest = new REST({ version:'10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body:COMMANDS });
        console.log('✅  Comandos registrados!');
    } catch(e) { console.error('Erro ao registrar comandos:', e); }
});

client.login(process.env.DISCORD_TOKEN);
