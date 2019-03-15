(function(){
  // 'use strict';

  const appConfig = require('config');
  appConfig.util.loadFileConfigs('../config');

  const cDebug = require('debug')('consumer');
  
  var mRedisHost = process.env.redisHost || appConfig.QueueOptions.redis.host;
  var mRedisPort = process.env.redisPort || appConfig.QueueOptions.redis.port;
  var mRedisProtocol =  process.env.redisProtocol || appConfig.QueueOptions.redis.type;
  const redisURI = `${mRedisProtocol}://${mRedisHost}:${mRedisPort}`;
  cDebug("default config params are:",appConfig);
  cDebug(`redis URI formed is ${redisURI}`);
  
  const Queue = require(appConfig.jobManager);
  const ffmpegJobsQueue = new Queue(appConfig.queueName, redisURI);

  var checkConfigurationValidity = new Promise(function(resolve,reject){
    // TODO : check all params for their validity
    resolve();
  });

  var checkStorageValidity = new Promise(function(resolve,reject){
    var fs = require('fs');
    if(!fs.existsSync(appConfig.dataDir)){
      cDebug(`${appConfig.dataDir} doesnot exist!`);
        if( !fs.existsSync(appConfig.localDataDir)){
          cDebug(`${appConfig.localDataDir} doesnot exist!`);
          cDebug("Data dump directories Dont Exist! Exiting");
          process.exit(1);
      }
      else{
        cDebug(`${appConfig.localDataDir} Exist!`);
        resolve();
      }
    }
    else{
      cDebug("Data dump directories Exist!");
      resolve();
    }
  });

  Promise.all([checkConfigurationValidity,checkStorageValidity])
  .then(() => {
    cDebug("All config checks have passed! Starting to Consume given Queue Now!");
    ffmpegJobsQueue.getJobs('VideoJobRunner')
    .then(mjobslist => {
      cDebug("Jobs list:", JSON.stringify(mjobslist));
    })
    ffmpegJobsQueue.process('VideoJobRunner','/home/beyond/github/ffmpeg-bull-longrun-jobconsumer/Jobs/videosaver.js');
  })
  .catch(err => {
    cDebug("Error occured after Checks!",err);
    process.exit();
  });
  
  ffmpegJobsQueue.on('completed', (job,result) => {
    cDebug(`Job named ${job.name} with Job ID ${job.id} completed with result as ${result}`);
    // TODO : send some events 
  });
})();

