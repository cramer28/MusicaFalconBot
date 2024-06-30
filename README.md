[![es](https://img.shields.io/badge/lang-es-blue.svg)](https://github.com/cramer28/MusicaFalconBot/blob/master/README.es.md)

# SuperFalcon Music Discord Bot

A simple Discord music bot that plays music from YouTube.

## Features
- Play music from YouTube
- Skip the current song
- Stop the music and clear the queue
- Show the current queue
- Autoplay to keep the music going
- Help command to list all available commands

## Commands
- `>play <YouTube URL> or search query` - Play a song from YouTube directly by url or entering a search query.
- `>skip` - Skip the current song.
- `>stop` - Stop the music and clear the queue.
- `>queue` - Show the current queue.
- `>autoplay` - Keep playing songs related to the last played.
- `>help` - Show help message.

## Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/cramer28/MusicaFalconBot.git
    cd MusicaFalconBot
    ```

2. Install dependencies: (you need to have Node.js preinstalled, preferably ver.18 or newer)
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your Discord bot token:
    ```env
    DISCORD_TOKEN=your-discord-bot-token
    YOUTUBE_API_KEY=your-google/youtube-api-key
    BOT_LANG=en
    ```

4. Start the bot:
    ```sh
    node bot.js
    ```

## Language Support

The bot supports multiple languages. To add a new language, create a new JSON file in the `lang` directory with the appropriate translations.

## Permissions

Ensure the bot has the following permissions:
- Connect
- Speak

## Hosting

You can host the bot on any cloud service provider. Ensure the environment variables are set up correctly.

## Contributing

Feel free to fork this repository and contribute by submitting a pull request.

## License

This project is licensed under the MIT License.
