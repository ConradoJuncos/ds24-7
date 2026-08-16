require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const sounds = require('./sounds');

// Un comando por cada audio, generado automáticamente desde sounds.js.
const commands = Object.keys(sounds).map((name) =>
    new SlashCommandBuilder()
        .setName(name)
        .setDescription('Reproduce un audio')
        .toJSON()
);

// Comando de la tabla de puntos.
commands.push(
    new SlashCommandBuilder()
        .setName('top')
        .setDescription('Muestra la tabla de puntos por tiempo en canales de voz')
        .toJSON()
);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log(`${commands.length} comandos registrados!`);
    } catch (error) {
        console.error('Error registrando comandos:', error);
    }
})();
