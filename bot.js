require('dotenv').config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const ytdl = require('ytdl-core');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    generateDependencyReport
} = require('@discordjs/voice');

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

console.log(generateDependencyReport());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const prefix = '>';
const queue = new Map();
const activeCollectors = new Map(); // To track active message collectors

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY // Your YouTube Data API key
});

// Load language files
const lang = process.env.BOT_LANG || 'en';
const messagesPath = path.join(__dirname, 'lang', lang, 'messages.json');
const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const serverQueue = queue.get(message.guild.id);

    if (command === 'play') {
        if (activeCollectors.has(message.author.id)) {
            activeCollectors.get(message.author.id).stop();
            activeCollectors.delete(message.author.id);
        }
        execute(message, serverQueue, args);
    } else if (command === 'skip') {
        skip(message, serverQueue);
    } else if (command === 'stop') {
        stop(message, serverQueue);
    } else if (command === 'queue') {
        showQueue(message, serverQueue);
    } else if (command === 'help') {
        help(message);
    }

});

async function execute(message, serverQueue, args) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send(messages.noVoiceChannel);
    if (!args[0]) return message.channel.send(messages.noArgs);

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
        return message.channel.send(messages.noPermissions);
    }

    let songInfo;
    let song;

    if (ytdl.validateURL(args[0])) {
        try {
            songInfo = await ytdl.getInfo(args[0]);
            song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };
        } catch (error) {
            console.error('Error getting video info:', error);
            return message.channel.send(messages.infoError);
        }
    } else {
        try {
            const searchResponse = await youtube.search.list({
                part: 'snippet',
                q: args.join(' '),
                maxResults: 5,
                type: 'video'
            });

            if (searchResponse.data.items.length === 0) {
                return message.channel.send(messages.searchNoResults);
            }

            const videos = searchResponse.data.items;
            let response = messages.searchInitialResponse;
            for (let i = 0; i < videos.length; i++) {
                response += `${i + 1} - ${videos[i].snippet.title} - ${videos[i].snippet.channelTitle}\n`;
            }
            response += messages.searchEndingResponse;

            message.channel.send(response);

            // Collect user's choice
            const filter = m => {
                return m.author.id === message.author.id && !isNaN(m.content) && m.content > 0 && m.content <= videos.length;
            };

            const collector = message.channel.createMessageCollector({ filter, time: 15000 });
            activeCollectors.set(message.author.id, collector);

            collector.on('collect', m => {
                const chosenVideo = videos[parseInt(m.content) - 1];
                song = {
                    title: chosenVideo.snippet.title,
                    url: `https://www.youtube.com/watch?v=${chosenVideo.id.videoId}`
                };
                collector.stop();
                activeCollectors.delete(message.author.id);
                handleSong(message, serverQueue, song);
            });

            collector.on('end', collected => {
                activeCollectors.delete(message.author.id);
                if (collected.size === 0) {
                    message.channel.send(messages.searchNoSelection);
                }
            });

            return;
        } catch (error) {
            console.error('Error searching YouTube:', error);
            return message.channel.send(messages.searchError);
        }
    }

    handleSong(message, serverQueue, song);

}

function handleSong(message, serverQueue, song) {
    const voiceChannel = message.member.voice.channel;

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
            player: createAudioPlayer()
        };

        queue.set(message.guild.id, queueContruct);
        queueContruct.songs.push(song);

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator
            });

            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);

            connection.subscribe(queueContruct.player);

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                queue.delete(message.guild.id);
            });

        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} ${messages.addedToQueue}`);
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    serverQueue.player.play(resource);
    serverQueue.textChannel.send(`${messages.nowPlaying} ${song.title}`);

    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    });

    serverQueue.player.on('error', error => {
        console.error(error);
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    });
}

async function skip(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send(messages.noVoiceChannelSkip);
    if (!serverQueue) return message.channel.send(messages.noSongToSkip);
    serverQueue.player.stop();
}

async function stop(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send(messages.noVoiceChannelStop);
    if (!serverQueue) return message.channel.send(messages.noSongToStop);

    serverQueue.songs = [];
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queue.delete(message.guild.id);
}

async function showQueue(message, serverQueue) {
    if (!serverQueue) return message.channel.send(messages.noQueue);
    const queueMessage = serverQueue.songs.map((song, index) => `${index + 1}. ${song.title}`).join('\n');
    return message.channel.send(`${messages.currentQueue}\n${queueMessage}`);
}

async function help(message) {
    const helpMessage = `
${messages.helpPlay}
${messages.helpSkip}
${messages.helpStop}
${messages.helpQueue}
${messages.helpHelp}
    `;
    return message.channel.send(helpMessage);
}

client.login(process.env.DISCORD_TOKEN);