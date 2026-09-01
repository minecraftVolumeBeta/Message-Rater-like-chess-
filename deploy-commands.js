require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const ratingChoices = [
    { name: 'criminal (🔒)', value: 'criminal' },
    { name: 'blunder (??)', value: 'blunder' },
    { name: 'mistake (?)', value: 'mistake' },
    { name: 'inaccuracy (?!)', value: 'inaccuracy' },
    { name: 'forced (➔)', value: 'forced' },
    { name: 'good (✓)', value: 'good' },
    { name: 'excellent (👍)', value: 'excellent' },
    { name: 'best (★)', value: 'best' },
    { name: 'book (📖)', value: 'book' },
    { name: 'great (!)', value: 'great' },
    { name: 'brilliant (!!)', value: 'brilliant' },
    { name: 'trilliant (!!!)', value: 'trilliant' },
    { name: 'trophy (🏆)', value: 'trophy' }
];

const commands = [
    new SlashCommandBuilder()
        .setName('evaluate')
        .setDescription('Evaluate a message like a chess.com move')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('The ID of the target message')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('rating')
                .setDescription('The rating to give the message')
                .setRequired(true)
                .addChoices(...ratingChoices)
        )
        .addStringOption(option =>
            option.setName('comment')
                .setDescription('Optional comment to add to the evaluation')
                .setRequired(false)
                .setMaxLength(100)
        )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registering...');
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );
        console.log('Registered!');
    }
    catch (error) {
        console.error(error);
    }
})();