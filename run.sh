#!/bin/bash
redisHost="192.168.1.114"
docker run --rm --name=camdiscovery-consumer -v /home/beyond/testing/DUMP:/data -e redisHost="192.168.1.114" saurabhshandy/camerasdiscovery-consumer