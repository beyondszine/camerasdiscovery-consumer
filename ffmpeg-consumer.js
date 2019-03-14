(function(){
  // 'use strict';

  const appConfig = require('config');
  const cDebug = require('debug')('consumer');
  const redisURI = `${appConfig.storage.type}://${appConfig.storage.host}:${appConfig.storage.port}`;
  cDebug("defautl config params are:",appConfig);
  cDebug(`redis URI formed is ${redisURI}`);

  const Queue = require(appConfig.jobManager);
  const ffmpegJobsQueue = new Queue(appConfig.queueName, redisURI);

  // ffmpegJobsQueue.process('VideoJobRunner','/home/beyond/nodejs/bulltry/videosaver.js');


  ffmpegJobsQueue.on('completed', (job,result) => {
    cDebug(`Job named ${job.name} with Job ID ${job.id} completed with result as ${result}`);
  });
})();

