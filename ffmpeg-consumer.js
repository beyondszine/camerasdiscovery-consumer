(function(){
  // 'use strict';

  const appConfig = require('config');
  const cDebug = require('debug')('consumer');
  const redisURI = `redis://${appConfig.storage.host}:${appConfig.storage.port}`;
  cDebug("defautl config params are:",appConfig);
  cDebug(`redis URI formed is ${redisURI}`);

  const Queue = require(appConfig.jobManager);
  const myFirstQueue = new Queue(appConfig.queueName, 'redis://127.0.0.1:6379');

  // myFirstQueue.process('VideoJobRunner','/home/beyond/nodejs/bulltry/videosaver.js');


  myFirstQueue.on('completed', (job,result) => {
    cDebug(`Job named ${job.name} with Job ID ${job.id} completed with result as ${result}`);
  });
})();

