(function(){
  // 'use strict';

  const appConfig = require('config');
  appConfig.util.loadFileConfigs('../config');
  const path = require('path');
  const cDebug = require('debug')('consumer');
  
  console.log(`Redis Environment: redisHost: ${process.env.redisHost}, redisPort: ${process.env.redisPort}`);
  // var mRedisHost;
  const jobsPath=path.join(__dirname,'/Jobs/');
  console.log(jobsPath);

  var mRedisHost = process.env.redisHost || appConfig.QueueOptions.redis.host;
  if(!process.env.redisHost){
    console.log("redisHost env variable not found!");
    mRedisHost=appConfig.QueueOptions.redis.host;
  }
  var mRedisPort = process.env.redisPort || appConfig.QueueOptions.redis.port;
  var mRedisProtocol =  process.env.redisProtocol || appConfig.QueueOptions.redis.type;
  const redisURI = `${mRedisProtocol}://${mRedisHost}:${mRedisPort}`;
  console.log("default config params are:",appConfig);
  console.log(`redis URI formed is ${redisURI}`);
  
  const Queue = require(appConfig.jobManager);
  const ffmpegJobsQueue = new Queue(appConfig.VideoJobsQueueName, redisURI);
  const relayServerJobsQueue = new Queue(appConfig.RelayServerJobsQueueName, redisURI);

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
        console.log(`Data dump directories Exist! Type: Interal, mounted : ${appConfig.localDataDir}`);
        resolve();
      }
    }
    else{
      console.log(`Data dump directories Exist! Type: External mounted : ${appConfig.dataDir}`);
      resolve();
    }
  });

  Promise.all([checkConfigurationValidity,checkStorageValidity])
  .then(() => {
    cDebug("All config checks have passed! Starting to Consume given Queue Now!");
    ffmpegJobsQueue.getJobs(appConfig.VideoJobsType)
    .then(mjobslist => {
      cDebug("Existing Jobs list:", JSON.stringify(mjobslist));
    })
    .catch(err => {
      cDebug('Error happened in querying current jobs list', err);
      process.exit();
    });
    relayServerJobsQueue.process(appConfig.RelayServerJobsType,jobsPath+'relayServer.js');
    ffmpegJobsQueue.process(appConfig.VideoJobsType,jobsPath+'videosaver.js');
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

