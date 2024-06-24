[![es](https://img.shields.io/badge/lang-es-blue.svg)](https://github.com/cramer28/MusicaFalconBot/blob/master/README.es.md)

# SuperFalcon Music Discord Bot

A simple Discord music bot that plays music from YouTube.

## Features
- Play music from YouTube
- Skip the current song
- Stop the music and clear the queue
- Show the current queue
- Help command to list all available commands

## Commands
- `>play <YouTube URL>` - Play a song from YouTube.
- `>skip` - Skip the current song.
- `>stop` - Stop the music and clear the queue.
- `>queue` - Show the current queue.
- `>help` - Show help message.

## Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/your-username/discord-music-bot.git
    cd discord-music-bot
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your Discord bot token:
    ```env
    DISCORD_TOKEN=your-discord-bot-token
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
- Manage Messages (for deleting user commands)

## Hosting

You can host the bot on any cloud service provider. Ensure the environment variables are set up correctly.

## Contributing

Feel free to fork this repository and contribute by submitting a pull request.

## License

MIT License in progress.
