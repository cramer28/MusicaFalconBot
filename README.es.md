[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/cramer28/MusicaFalconBot/)

# SuperFalcon Musica Discord Bot

Un simple bot de música para Discord que reproduce música desde YouTube.

## Características
- Reproduce música desde YouTube o Youtube Music
- Pausa, Salta o Muestra Info sobre la canción actual
- Detiene la música y borra la cola
- Muestra la cola actual
- Mantiene la música sonando con la función de Autoplay
- Comando de ayuda para listar todos los comandos disponibles

## Comandos
- `>play <URL de YouTube> o nombre de cancion` - Reproduce una canción desde YouTube ya sea con un link o eligiendo de una lista de resultados.
- `>pause` - Pausa/Reanuda la reproducción de música.
- `>skip` - Salta la canción actual.
- `>stop` - Detiene la música y borra la cola.
- `>queue` - Muestra la cola actual.
- `>info` - Muestra Información sobre la canción actual.
- `>autoplay` - Activa/Desactiva la funcion de Autoplay para reproducir canciones relacionadas.
- `>help` - Muestra el mensaje de ayuda.

## Configuración

1. Clona el repositorio:
    ```sh
    git clone https://github.com/cramer28/MusicaFalconBot.git
    cd MusicaFalconBot
    ```

2. Instala las dependencias: (necesitas tener Node.js preinstalado, preferiblemente ver.18 o mas nueva)
    ```sh
    npm install
    ```

3. Crea un archivo `.env` en el directorio raíz y agrega el token de tu bot de Discord:
    ```env
    DISCORD_TOKEN=tu-token-de-discord
    YOUTUBE_API_KEY=tu-token-de-google/youtube
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

## Alojamiento

Puedes alojar el bot en cualquier proveedor de servicios en la nube. Asegúrate de que las variables de entorno estén configuradas correctamente.

## Contribuir

Siéntete libre de bifurcar este repositorio y contribuir enviando una solicitud de extracción (pull request).

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.
