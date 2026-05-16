require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('hola')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('gustos')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('jueves')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('no')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('nojojo')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('orto')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('ostras')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('para')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('rompeque')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('si')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('sii')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('femboys')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('miss')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('notamara')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('fems')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('lol')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('lunes')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('nosaques')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('paja')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('literal')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Reproduce un audio')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('trompadas')
        .setDescription('Reproduce un audio')
        .toJSON()
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
    );
    console.log('Comando registrado!');
})();
