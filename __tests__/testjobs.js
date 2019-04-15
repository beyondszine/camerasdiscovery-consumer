[
    {
        "url": "rtsp://192.168.1.99/live/av0?user=admin&passwd=admin",
        "type": "local",
        "saveOptions": {
            "type": "file",
            "value": "10s640pSave.ts",
            "maxfilesize": "30",
            "duration": "10"
        },
        "videostreamOptions": {
            "enabled": true,
            "restream": false,
            "fps": "auto",
            "videosize": "640x480",
            "codec": "mpeg1video",
            "transport": "tcp",
            "format": "mpegts"
        },
        "audiostreamOptions": {
            "enabled": false
        }
    },
    {
        "url": "rtsp://192.168.1.99/live/av0?user=admin&passwd=admin",
        "type": "local",
        "saveOptions": {
            "type": "file",
            "value": "20sSave.ts",
            "maxfilesize": "30",
            "duration": "10"
        },
        "videostreamOptions": {
            "enabled": true,
            "restream": false,
            "fps": "auto",
            "videosize": "1280x720",
            "codec": "mpeg1video",
            "transport": "tcp",
            "format": "mpegts"
        },
        "audiostreamOptions": {
            "enabled": false
        }
    },
    {
        "url": "rtsp://192.168.1.99/live/av0?user=admin&passwd=admin",
        "type": "local",
        "videostreamOptions": {
            "enabled": true,
            "restream": true,
            "fps": "auto",
            "videosize": "1280x720",
            "codec": "mpeg1video",
            "transport": "tcp",
            "format": "mpegts"
        },
        "audiostreamOptions": {
            "enabled": false
        }
    },
    {
        "url": "rtsp://192.168.1.99/live/av0?user=admin&passwd=admin",
        "type": "URL",
        "videostreamOptions": {
            "enabled": true,
            "restream": true,
            "fps": "auto",
            "videosize": "1280x720",
            "codec": "mpeg1video",
            "transport": "tcp",
            "format": "mpegts"
        },
        "audiostreamOptions": {
            "enabled": false
        },
        "value": "http://localhost:10000"
    }
]