
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState
} = require('@discordjs/voice');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

let connection = null;

async function conectarAlCanal() {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    if (!channel) {
        console.error('Canal no encontrado. Verificá el CHANNEL_ID.');
        return;
    }

    connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfMute: true,
        selfDeaf: true,
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        console.log(`Conectado a: ${channel.name}`);
    } catch {
        console.error('No se pudo conectar, reintentando...');
        connection.destroy();
        connection = null;
        setTimeout(conectarAlCanal, 5000);
        return;
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log('Desconectado, reconectando...');
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 3_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 3_000),
            ]);
        } catch {
            connection.destroy();
            connection = null;
            setTimeout(conectarAlCanal, 3000);
        }
    });

    connection.on('error', (error) => {
        console.error('Error en la coenxión de voz:', error);
        connection.destroy();
        connection = null;
        setTimeout(conectarAlCanal, 5000);
    });
}

// Evita que el proceso crashee por errores no manejados
process.on('unhandledRejection', (error) => {
  console.error('Error no manejado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error);
});

client.once('ready', () => {
    console.log(`Bot listo: ${client.user.tag}`);
    conectarAlCanal();
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!connection) {
        return interaction.reply({ content: 'Bot reconectando, esperá un momento.', flags: 64 });
    }

    const comandos = {
        'hola': './audios/josHola.wav',
        'gustos': './audios/gustos.wav',
        'jueves': './audios/jueves.wav',
        'no': './audios/no.wav',
        'nojojo': './audios/nojojo.wav',
        'orto': './audios/orto.wav',
        'ostras': './audios/ostras.wav',
        'para': './audios/para.wav',
        'rompeque': './audios/rompeque.wav',
        'si': './audios/si.wav',
        'sii': './audios/sii.wav',
        'trompadas': './audios/trompadas.wav',
        'notamara': './audios/notamara.wav',
        'femboys': './audios/femboys.wav',
        'miss': './audios/miss.wav',
        'fems': './audios/fems.wav',
        'lol': './audios/lol.wav',
        'lunes': './audios/lunes.wav',
        'paja': './audios/paja.wav',
        'literal': './audios/literal.wav',
        'nosaques': './audios/nosaques.wav',
        'cat': './audios/cat.wav',
    };

    const archivo = comandos[interaction.commandName];
    if (!archivo) return;

    try {
        await interaction.reply({ content: 'El pepe', flags: 64 });

        const player = createAudioPlayer();
        const resource = createAudioResource(archivo);

        connection.subscribe(player);
        player.play(resource);

        player.on(AudioPlayerStatus.Idle, () => {
            connection.setSpeaking(false);
        });

        player.on('error', (error) => {
            console.error('Error reproduciendo audio:', error);
        });

    } catch (error) {
        console.error('Error en el comando:', error);
    }

});

client.login(process.env.DISCORD_TOKEN);
