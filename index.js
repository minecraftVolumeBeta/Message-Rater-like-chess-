require('dotenv').config();

const { CLient, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
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

function truncateText(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    const truncated = str.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'evaluate') return;

    await interaction.deferReply();

    const messageId = interaction.options.getString('message_id');
    const rating = interaction.options.getString('rating');
    const rawComment = interaction.options.getString('comment');
    const comment = rawComment ? truncateText(rawComment, 100) : null;

    try {
        const targetMessage = await interaction.channel.messages.fetch(messageId);
        if (!targetMessage) {
            return interaction.editReply({ content: 'Message not found. Please check the message ID and try again.', ephemeral: true });
        }

        if (targetMessage.attachments.size > 0) {
            return interaction.editReply({ content: 'Cannot evaluate messages with attachments.', ephemeral: true });
        }

        const content = truncateText(targetMessage.content || '', 250);
        const author = targetMessage.author;
        const avatarUrl = author.displayAvatarURL({ extension: 'png' , size: 256});

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
            ctx.font = 'italic 16px "Sans-Serif"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const reasonCenterX = rightSectionX + (rightSectionWidth / 2);
            const reasonStartY = iconY + iconSize + 12;

            const words = reason.split(' ');
            let line = '';
            let lines = [];

            for (let n=0; n<words.length; n++) {
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
        ctx.font = '24px "Sans-Serif"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const textX = avatarX + avatarSize + 40;
        const maxWidth = rightSectionX - textX - 30;

        const msgWords = content.split(' ');
        let msgLine = '';
        let msgLines = [];

        for (let n=0; n<msgWords.length; n++) {
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

    }
    catch (err) {
        console.error(err);
        await interaction.editReply({ content: 'An error occurred while processing the evaluation.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);