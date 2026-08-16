require('dotenv').config();
const path = require('path');
const { exec } = require('child_process');
const { Client, GatewayIntentBits, MessageFlags, EmbedBuilder } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    entersState,
} = require('@discordjs/voice');

const sounds = require('./sounds');
const points = require('./points');

// --- Configuración de puntos ---
const POINTS_INTERVAL_MS = 30_000; // Cada 30 segundos...
const POINTS_PER_INTERVAL = 10;    // ...se otorgan 10 puntos.

// --- Configuración del watchdog de conexión ---
const WATCHDOG_MS = 20_000; // Cada cuánto verificamos que el bot siga en el VC.
const STUCK_MS = 40_000;    // Si lleva más de esto sin estar "Ready", recreamos.

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// El reproductor se crea UNA sola vez y se suscribe a la conexión activa.
// Reusar el mismo player evita fugas de listeners al reproducir muchas veces.
const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
});
player.on('error', (error) => console.error('Error reproduciendo audio:', error));

let connection = null;
let connecting = false;
let lastReadyAt = Date.now(); // Última vez que la conexión estuvo realmente "Ready".

// --- Wake lock de Termux ---
// En Android, con la pantalla apagada, el SO suspende el proceso (Doze) y los
// timers dejan de dispararse: el bot no puede reconectarse. El wake lock evita eso.
// Si no estamos en Termux, el comando falla en silencio y seguimos igual.
function adquirirWakeLock() {
    exec('termux-wake-lock', (err) => {
        if (err) console.log('termux-wake-lock no disponible (¿no es Termux?). Continuando sin él.');
        else console.log('🔒 Wake lock de Termux adquirido (evita que Android suspenda el bot).');
    });
}

async function conectarAlCanal() {
    if (connecting) return;
    connecting = true;
    try {
        const channel = await client.channels.fetch(process.env.CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isVoiceBased()) {
            console.error('Canal de voz no encontrado. Verificá el CHANNEL_ID.');
            return;
        }

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfMute: false,
            selfDeaf: true,
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            lastReadyAt = Date.now();
        });

        // Discord nos movió/desconectó. Intentamos RESUMIR sin salir del VC.
        // Si no se puede resumir, el watchdog se encargará de recrear la conexión.
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Se está reconectando solo: seguimos en la llamada.
            } catch {
                console.log('No se pudo resumir, recreando conexión...');
                try { connection.destroy(); } catch {}
                connection = null;
                setTimeout(conectarAlCanal, 3_000);
            }
        });

        connection.on('error', (error) => {
            console.error('Error en la conexión de voz:', error);
        });

        connection.subscribe(player);

        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        lastReadyAt = Date.now();
        console.log(`✅ Conectado a: ${channel.name}`);
    } catch {
        console.error('No se pudo conectar, reintentando en 5s...');
        if (connection) { try { connection.destroy(); } catch {} }
        connection = null;
        setTimeout(conectarAlCanal, 5_000);
    } finally {
        connecting = false;
    }
}

// --- Watchdog: garantiza que el bot nunca se quede afuera del VC ---
// Cubre los casos que los eventos no detectan: conexiones "fantasma" (el bot
// cree estar Ready pero Discord lo sacó) y conexiones atascadas en Signalling.
function verificarConexion() {
    if (connecting) return;

    const status = connection?.state?.status;

    // Sin conexión o destruida -> reconectar.
    if (!connection || status === VoiceConnectionStatus.Destroyed) {
        console.log('[watchdog] Sin conexión de voz, reconectando...');
        conectarAlCanal();
        return;
    }

    // ¿Discord realmente nos ve dentro del canal?
    const me = client.guilds.cache.get(connection.joinConfig.guildId)?.members?.me;
    const canalActual = me?.voice?.channelId ?? null;

    if (status === VoiceConnectionStatus.Ready) {
        // Conexión "fantasma": estamos Ready pero Discord no nos ve en el canal.
        if (me && canalActual !== connection.joinConfig.channelId) {
            console.log('[watchdog] Conexión fantasma detectada, recreando...');
            try { connection.destroy(); } catch {}
            connection = null;
            conectarAlCanal();
        }
        return; // Sano.
    }

    // No está Ready ni Destroyed (Signalling/Connecting). Si lleva mucho atascado, recrear.
    if (Date.now() - lastReadyAt > STUCK_MS) {
        console.log(`[watchdog] Conexión atascada en "${status}", recreando...`);
        try { connection.destroy(); } catch {}
        connection = null;
        conectarAlCanal();
    }
}

// --- Seguimiento de tiempo en canales de voz ---
// Cada POINTS_INTERVAL_MS recorremos los canales de voz del servidor y
// premiamos a cada miembro humano que esté en uno (que no sea el canal AFK).
// Nota: esto NO depende de que el bot esté en el VC, solo de que el gateway esté vivo.
function iniciarSeguimientoDePuntos() {
    setInterval(() => {
        for (const guild of client.guilds.cache.values()) {
            const afkChannelId = guild.afkChannelId;
            for (const channel of guild.channels.cache.values()) {
                if (!channel.isVoiceBased()) continue;
                if (channel.id === afkChannelId) continue;
                for (const member of channel.members.values()) {
                    if (member.user.bot) continue;
                    points.addPoints(member.id, member.user.username, POINTS_PER_INTERVAL);
                }
            }
        }
    }, POINTS_INTERVAL_MS);
}

// Evita que el proceso crashee por errores no manejados.
process.on('unhandledRejection', (error) => console.error('Error no manejado:', error));
process.on('uncaughtException', (error) => console.error('Excepción no capturada:', error));

// Libera el wake lock al cerrar para no dejarlo colgado.
function salir() {
    exec('termux-wake-unlock', () => process.exit(0));
}
process.on('SIGINT', salir);
process.on('SIGTERM', salir);

// Visibilidad de la conexión con Discord (ayuda a diagnosticar caídas de red).
client.on('shardDisconnect', (event, id) => console.log(`[shard ${id}] desconectado (código ${event?.code})`));
client.on('shardReconnecting', (id) => console.log(`[shard ${id}] reconectando...`));
client.on('shardResume', (id) => console.log(`[shard ${id}] reanudado`));
client.on('error', (error) => console.error('[client error]', error));

client.once('ready', () => {
    console.log(`Bot listo: ${client.user.tag}`);
    adquirirWakeLock();
    conectarAlCanal();
    iniciarSeguimientoDePuntos();
    setInterval(verificarConexion, WATCHDOG_MS);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // --- Comando /top: tabla de puntos ---
    if (interaction.commandName === 'top') {
        return mostrarTop(interaction);
    }

    // --- Comandos de audio ---
    const archivo = sounds[interaction.commandName];
    if (!archivo) return;

    if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
        return interaction.reply({ content: 'Bot reconectando, esperá un momento.', flags: MessageFlags.Ephemeral })
            .catch(() => {});
    }

    try {
        const resource = createAudioResource(path.join(__dirname, 'audios', archivo));
        player.play(resource);
        await interaction.reply({ content: '🔊 Reproduciendo', flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error en el comando:', error);
        interaction.reply({ content: 'Hubo un error al reproducir.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
});

async function mostrarTop(interaction) {
    const tabla = points.leaderboard();
    if (tabla.length === 0) {
        return interaction.reply('Todavía no hay puntos registrados.').catch(() => {});
    }

    const top = tabla.slice(0, 20);
    const lineas = top.map((u, i) => {
        const pos = `${i + 1}.`.padEnd(3);
        const nombre = u.username.slice(0, 18).padEnd(18);
        return `${pos} ${nombre} ${u.points}`;
    });

    const embed = new EmbedBuilder()
        .setTitle('🏆 Tabla de puntos')
        .setDescription('```\n#   Usuario            Puntos\n' + lineas.join('\n') + '\n```')
        .setColor(0xFFD700);

    interaction.reply({ embeds: [embed] }).catch(() => {});
}

client.login(process.env.DISCORD_TOKEN);
