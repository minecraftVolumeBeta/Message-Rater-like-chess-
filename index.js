require('dotenv').config();

const { 
  Client, 
  GatewayIntentBits, 
  AttachmentBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const targetMessageCache = new Map();

function truncateText(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  const truncated = str.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}! Bot is active.`);
});

client.on('interactionCreate', async (interaction) => {
  
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Evaluate Message') {
    const targetMsg = interaction.targetMessage;
    targetMessageCache.set(interaction.user.id, targetMsg);

    const modal = new ModalBuilder()
      .setCustomId('evaluate_modal')
      .setTitle('Evaluate Message');

    const ratingInput = new TextInputBuilder()
      .setCustomId('rating_input')
      .setLabel('Rating')
      .setPlaceholder('good, blunder, brilliant, mistake, criminal, etc.')
      .setValue('good')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason_input')
      .setLabel('Reason (Optional)')
      .setPlaceholder('Why this evaluation?')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(ratingInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );

    await interaction.showModal(modal);
    return;
  }

  let targetMessage;
  let rating = 'good';
  let reason = null;

  if (interaction.isModalSubmit() && interaction.customId === 'evaluate_modal') {
    await interaction.deferReply();
    targetMessage = targetMessageCache.get(interaction.user.id);
    targetMessageCache.delete(interaction.user.id);

    const rawRating = interaction.fields.getTextInputValue('rating_input').toLowerCase().trim();
    const rawReason = interaction.fields.getTextInputValue('reason_input');

    const validRatings = ['criminal', 'blunder', 'mistake', 'inaccuracy', 'good', 'excellent', 'best', 'book', 'great', 'brilliant', 'trilliant', 'trophy'];
    rating = validRatings.includes(rawRating) ? rawRating : 'good';
    reason = rawReason ? truncateText(rawReason, 100) : null;

  } else if (interaction.isChatInputCommand() && interaction.commandName === 'evaluate') {
    await interaction.deferReply();

    const messageId = interaction.options.getString('message_id');
    rating = interaction.options.getString('rating');
    const rawReason = interaction.options.getString('reason');
    reason = rawReason ? truncateText(rawReason, 100) : null;

    try {
      targetMessage = await interaction.channel.messages.fetch(messageId);
    } catch (error) {
      return interaction.editReply('Invalid message ID or cannot fetch messages in this channel.');
    }
  } else {
    return;
  }

  try {
    if (!targetMessage) {
      return interaction.editReply('Target message missing or expired. Please try again.');
    }

    if (targetMessage.attachments && targetMessage.attachments.size > 0) {
      return interaction.editReply('Cannot evaluate messages with attachments.');
    }

    const content = truncateText(targetMessage.content || '[Empty Message]', 250);
    const author = targetMessage.author;
    const avatarUrl = author.displayAvatarURL({ extension: 'png', size: 256 });

    const canvasWidth = 1100;
    const canvasHeight = 240;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const avatarImage = await loadImage(avatarUrl);
    const avatarSize = 140;
    const avatarX = 50;
    const avatarY = (canvasHeight - avatarSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (['criminal', 'blunder'].includes(rating)) {
      ctx.filter = 'grayscale(100%)';
    }

    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Position Right Column (Badge Icon + Reason)
    const iconSize = 90;
    const rightSectionWidth = 180;
    const rightSectionX = canvasWidth - 50 - rightSectionWidth;
    const iconX = rightSectionX + (rightSectionWidth - iconSize) / 2;
    const iconY = reason ? 35 : (canvasHeight - iconSize) / 2;

    const iconPath = path.join(__dirname, 'icons', `${rating}.png`);
    if (fs.existsSync(iconPath)) {
      const badgeIcon = await loadImage(iconPath);
      ctx.drawImage(badgeIcon, iconX, iconY, iconSize, iconSize);
    }

    if (reason) {
      ctx.fillStyle = '#A0A0A0';
      ctx.font = 'italic 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const reasonCenterX = rightSectionX + (rightSectionWidth / 2);
      const reasonStartY = iconY + iconSize + 12;

      const words = reason.split(' ');
      let line = '';
      let lines = [];

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > rightSectionWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

      lines.slice(0, 3).forEach((l, index) => {
        ctx.fillText(l, reasonCenterX, reasonStartY + (index * 20));
      });
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const textX = avatarX + avatarSize + 40;
    const maxWidth = rightSectionX - textX - 30;

    const msgWords = content.split(' ');
    let msgLine = '';
    let msgLines = [];

    for (let n = 0; n < msgWords.length; n++) {
      let testLine = msgLine + msgWords[n] + ' ';
      let metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        msgLines.push(msgLine.trim());
        msgLine = msgWords[n] + ' ';
      } else {
        msgLine = testLine;
      }
    }
    msgLines.push(msgLine.trim());

    const lineHeight = 32;
    const startY = (canvasHeight / 2) - ((msgLines.length - 1) * lineHeight / 2);
    msgLines.slice(0, 4).forEach((l, index) => {
      ctx.fillText(l, textX, startY + (index * lineHeight));
    });

    const buffer = await canvas.encode('png');
    const attachment = new AttachmentBuilder(buffer, { name: 'evaluation.png' });

    await interaction.editReply({ files: [attachment] });

  } catch (err) {
    console.error('Unhandled error:', err);
    await interaction.editReply('An error occurred while processing the evaluation.');
  }
});

client.login(process.env.DISCORD_TOKEN);