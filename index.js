require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

let connection = null;

function conectarAlCanal() {
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);
  if (!channel) {
    console.error('Canal no encontrado. Verificá el CHANNEL_ID.');
    return;
  }

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfMute: true,   // bot muteado
    selfDeaf: true,   // bot con auriculares puestos
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    console.log('Desconectado, reconectando en 5s...');
    setTimeout(conectarAlCanal, 5000);
  });

  console.log(`Conectado a: ${channel.name}`);
}

client.once('ready', () => {
  console.log(`Bot listo: ${client.user.tag}`);
  conectarAlCanal();
});

client.login(process.env.DISCORD_TOKEN);
