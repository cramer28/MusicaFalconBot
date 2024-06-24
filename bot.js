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
const sodium = require('libsodium-wrappers');

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

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const serverQueue = queue.get(message.guild.id);

    if (command === 'play') {
        execute(message, serverQueue, args);
    } else if (command === 'skip') {
        skip(message, serverQueue);
    } else if (command === 'stop') {
        stop(message, serverQueue);
    } else if (command === 'queue') {
        showQueue(message, serverQueue);
    }
});

async function execute(message, serverQueue, args) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
        return message.channel.send('I need the permissions to join and speak in your voice channel!');
    }

    const songInfo = await ytdl.getInfo(args[0]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url
    };

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
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy(); // Correct way to leave the voice channel
        queue.delete(guild.id);
        return;
    }

    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    serverQueue.player.play(resource);
    serverQueue.textChannel.send(`Now playing: ${song.title}`);

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

function skip(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to skip the music!');
    if (!serverQueue) return message.channel.send('There is no song that I could skip!');
    serverQueue.player.stop();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to stop the music!');
    if (!serverQueue) return message.channel.send('There is no song that I could stop!');

    serverQueue.songs = [];
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queue.delete(message.guild.id);
}

function showQueue(message, serverQueue) {
    if (!serverQueue) return message.channel.send('There is no song in the queue!');
    const queueMessage = serverQueue.songs.map((song, index) => `${index + 1}. ${song.title}`).join('\n');
    return message.channel.send(`Current queue:\n${queueMessage}`);
}

client.login(process.env.DISCORD_TOKEN);