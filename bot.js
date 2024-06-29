require('dotenv').config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField, ActivityType } = require('discord.js');
const ytdl = require('ytdl-core');
const { google } = require('googleapis');
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY // Your YouTube Data API key
});
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    generateDependencyReport
} = require('@discordjs/voice');


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

// Load language files
const lang = process.env.BOT_LANG || 'en';
const messagesPath = path.join(__dirname, 'lang', lang, 'messages.json');
const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

client.once('ready', () => {
    console.log('Bot is online!');
    client.user.setActivity('>help', { type: ActivityType.Listening });
    //client.setMaxListeners(20);
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
        displayQueue(message, serverQueue);
    } else if (command === 'help') {
        help(message);
    } else if (command === 'autoplay') {
        toggleAutoplay(message, serverQueue);
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
        const url = args[0];
        if (url.includes('list=')) {
            return handlePlaylist(message, url);
        } else {
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

const handlePlaylist = async (message, playlistUrl) => {
    // Extract the initial video ID and the playlist ID from the URL
    const initialVideoId = playlistUrl.split('v=')[1].split('&')[0];
    const playlistId = playlistUrl.split('list=')[1];

    // Function to get video details
    const getVideoDetails = async (videoId) => {
        try {
            const videoInfo = await youtube.videos.list({
                part: 'snippet',
                id: videoId
            });
            const video = videoInfo.data.items[0];
            return {
                title: video.snippet.title,
                url: `https://www.youtube.com/watch?v=${videoId}`
            };
        } catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    };

    // Add the initial video to the queue
    const initialVideo = await getVideoDetails(initialVideoId);
    message.channel.send(`${initialVideo.title} ${messages.addedToQueue}`);
    handleSong(message, queue.get(message.guild.id), initialVideo, true);

    // Fetch the rest of the playlist
    try {
        const playlistResponse = await youtube.playlistItems.list({
            part: 'snippet',
            playlistId: playlistId,
            maxResults: 50
        });

        const videos = playlistResponse.data.items.map(item => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
        }));

        if (videos.length === 0) {
            return message.channel.send(messages.playlistEmpty);
        }

        message.channel.send(messages.playlistQuestion);

        const filter = m => m.author.id === message.author.id && ['1', '2'].includes(m.content);
        const collector = message.channel.createMessageCollector({ filter, time: 15000 });

        collector.on('collect', m => {
            if (m.content === '1') {
                // If the user chose to add the first song, it's already added
                message.channel.send(messages.playlistFirstAdd);
            } else if (m.content === '2') {
                message.channel.send(`${videos.length} ${messages.multiQueueAdd}`);
                videos.forEach(video => handleSong(message, queue.get(message.guild.id), video, false));
            }
            collector.stop();
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                message.channel.send(messages.searchNoSelection);
            }
        });

        return;
    } catch (error) {
        console.error('Error fetching playlist:', error);
        return message.channel.send(messages.playlistError);
    }
};


function handleSong(message, serverQueue, song, sendMessage = true) {
    const voiceChannel = message.member.voice.channel;

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
            autoplay: false,
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
        if (sendMessage) {
            return message.channel.send(`${song.title} ${messages.addedToQueue}`);
        }
    }
}

//#region Comandos

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        client.user.setActivity('>help', { type: ActivityType.Listening });
        return;
    }

    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    serverQueue.player.play(resource);
    serverQueue.textChannel.send(`${messages.nowPlaying} ${song.title}`);
    client.user.setActivity(`${song.title}`, { type: ActivityType.Playing });

    serverQueue.player.on(AudioPlayerStatus.Idle, async () => {
        serverQueue.songs.shift();
        if (serverQueue.autoplay && !serverQueue.songs.length) {
            try {
                const relatedSongs = await ytdl.getInfo(song.url);
                const relatedSong = relatedSongs.related_videos.find(video => video.length_seconds > 0);
                if (relatedSong) {
                    serverQueue.songs.push({
                        title: relatedSong.title,
                        url: `https://www.youtube.com/watch?v=${relatedSong.id}`
                    });
                }
            } catch (error) {
            console.error('Error fetching related song for autoplay:', error);
            }
        }
        
        play(guild, serverQueue.songs[0]);
    });

    serverQueue.player.on('error', error => {
        console.error('Audio Player Error:', error);
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    });
    
}

async function skip(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send(messages.noVoiceChannelSkip);
    if (!serverQueue) return message.channel.send(messages.noSongToSkip);

    const currentSong = serverQueue.songs.shift();
    if (serverQueue.autoplay && !serverQueue.songs.length) {
        try {
            const relatedSongs = await ytdl.getInfo(currentSong.url);
            const relatedSong = relatedSongs.related_videos.find(video => video.length_seconds > 0);
            if (relatedSong) {
                serverQueue.songs.push({
                    title: relatedSong.title,
                    url: `https://www.youtube.com/watch?v=${relatedSong.id}`
                });
            }
        } catch (error) {
            console.error('Error fetching related song for autoplay:', error);
        }
    }

    serverQueue.player.stop();
    play(message.guild, serverQueue.songs[0]);

}

async function stop(message, serverQueue) {
    if (!message.member.voice.channel) return message.channel.send(messages.noVoiceChannelStop);
    if (!serverQueue) return message.channel.send(messages.noSongToStop);

    serverQueue.songs = [];
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queue.delete(message.guild.id);
    client.user.setActivity('>help', { type: ActivityType.Listening });
}

const displayQueue = (message, serverQueue) => {
    if (!serverQueue || !serverQueue.songs.length) {
        return message.channel.send(messages.noQueue);
    }

    let queueMessage = messages.currentQueue;
    const maxDisplay = 10; // Limit to show only the first 10 songs
    serverQueue.songs.slice(0, maxDisplay).forEach((song, index) => {
        queueMessage += `${index + 1}. ${song.title}\n`;
    });

    if (serverQueue.songs.length > maxDisplay) {
        queueMessage += `... ${serverQueue.songs.length - maxDisplay} ${messages.leftInQueue}`;
    }

    // Split the queueMessage into chunks of 2000 characters
    const chunkSize = 2000;
    for (let i = 0; i < queueMessage.length; i += chunkSize) {
        const chunk = queueMessage.substring(i, i + chunkSize);
        message.channel.send(chunk);
    }
};

async function help(message) {
    const helpMessage = `
${messages.helpPlay}
${messages.helpSkip}
${messages.helpStop}
${messages.helpQueue}
${messages.helpAutoplay}
${messages.helpHelp}
    `;
    return message.channel.send(helpMessage);
}

function toggleAutoplay(message, serverQueue) {
    if (!serverQueue) return message.channel.send(messages.noQueue);
    serverQueue.autoplay = !serverQueue.autoplay;
    message.channel.send(serverQueue.autoplay ? messages.autoEnabled : messages.autoDisabled);
}

//#endregion

client.login(process.env.DISCORD_TOKEN);