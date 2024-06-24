[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/cramer28/MusicaFalconBot/)

# SuperFalcon Musica Discord Bot

Un simple bot de música para Discord que reproduce música desde YouTube.

## Características
- Reproduce música desde YouTube
- Salta la canción actual
- Detiene la música y borra la cola
- Muestra la cola actual
- Comando de ayuda para listar todos los comandos disponibles

## Comandos
- `>play <URL de YouTube>` - Reproduce una canción desde YouTube.
- `>skip` - Salta la canción actual.
- `>stop` - Detiene la música y borra la cola.
- `>queue` - Muestra la cola actual.
- `>help` - Muestra el mensaje de ayuda.

## Configuración

1. Clona el repositorio:
    ```sh
    git clone https://github.com/your-username/discord-music-bot.git
    cd discord-music-bot
    ```

2. Instala las dependencias:
    ```sh
    npm install
    ```

3. Crea un archivo `.env` en el directorio raíz y agrega el token de tu bot de Discord:
    ```env
    DISCORD_TOKEN=tu-token-de-discord
    BOT_LANG=es
    ```

4. Inicia el bot:
    ```sh
    node bot.js
    ```

## Soporte de Idiomas

El bot soporta múltiples idiomas. Para agregar un nuevo idioma, crea un nuevo archivo JSON en el directorio `lang` con las traducciones apropiadas.

## Permisos

Asegúrate de que el bot tenga los siguientes permisos:
- Conectar
- Hablar
- Gestionar Mensajes (para borrar los comandos de usuario)

## Alojamiento

Puedes alojar el bot en cualquier proveedor de servicios en la nube. Asegúrate de que las variables de entorno estén configuradas correctamente.

## Contribuir

Siéntete libre de bifurcar este repositorio y contribuir enviando una solicitud de extracción (pull request).

## Licencia

Licencia MIT en progreso.
