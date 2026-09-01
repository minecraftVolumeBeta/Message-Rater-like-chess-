require('dotenv').config();
const { 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ContextMenuCommandBuilder, 
  ApplicationCommandType,
  ApplicationIntegrationType, 
  InteractionContextType 
} = require('discord.js');

const ratingChoices = [
  { name: 'criminal (🔒)', value: 'criminal' },
  { name: 'blunder (??)', value: 'blunder' },
  { name: 'mistake (?)', value: 'mistake' },
  { name: 'inaccuracy (?!)', value: 'inaccuracy' },
  { name: 'good (✓)', value: 'good' },
  { name: 'excellent (👍)', value: 'excellent' },
  { name: 'best (★)', value: 'best' },
  { name: 'book (📖)', value: 'book' },
  { name: 'great (!)', value: 'great' },
  { name: 'brilliant (!!)', value: 'brilliant' },
  { name: 'trilliant (!!!)', value: 'trilliant' },
  { name: 'trophy (🏆)', value: 'trophy' },
];

const commands = [
  // Slash Command
  new SlashCommandBuilder()
    .setName('evaluate')
    .setDescription('Evaluate a message like a Chess.com move!')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ])
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The ID of the target message')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('rating')
        .setDescription('The move rating classification')
        .setRequired(true)
        .addChoices(...ratingChoices)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Optional explanation for the evaluation (max 100 chars)')
        .setRequired(false)
        .setMaxLength(100)
    ),

  new ContextMenuCommandBuilder()
    .setName('Evaluate Message')
    .setType(ApplicationCommandType.Message)
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ])
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering user-installable commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Commands registered successfully.');
  } catch (error) {
    console.error(error);
  }
})();