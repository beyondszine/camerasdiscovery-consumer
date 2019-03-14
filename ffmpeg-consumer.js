(function(){
  // 'use strict';

  const appConfig = require('config');
  const cDebug = require('debug')('consumer');
  const redisURI = `${appConfig.QueueOptions.redis.type}://${appConfig.QueueOptions.redis.host}:${appConfig.QueueOptions.redis.port}`;
  cDebug("default config params are:",appConfig);
  cDebug(`redis URI formed is ${redisURI}`);
  const Queue = require(appConfig.jobManager);
  const ffmpegJobsQueue = new Queue(appConfig.queueName, redisURI);

  var checkConfigurationValidity = new Promise(function(resolve,reject){
    resolve();
  });

  var checkStorageValidity = new Promise(function(resolve,reject){
    resolve();
  });

  Promise.all([checkConfigurationValidity,checkStorageValidity])
  .then(() => {
    cDebug("All config checks have passed! Starting to Consume given Queue Now!");
  })
  .catch(err => {
    cDebug("Error occured during validation checks!",err);
    process.exit();
  });
  // ffmpegJobsQueue.process('VideoJobRunner','/home/beyond/nodejs/bulltry/videosaver.js');

  ffmpegJobsQueue.on('completed', (job,result) => {
    cDebug(`Job named ${job.name} with Job ID ${job.id} completed with result as ${result}`);
  });
})();

