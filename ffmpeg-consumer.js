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
    console.log("Configuration Valid!");
    resolve();
  });

  var checkStorageValidity = new Promise(function(resolve,reject){
    var fs = require('fs');
    if(!fs.existsSync(appConfig.dataDir)){
      console.log(`${appConfig.dataDir} doesnot exist!`);
        if( !fs.existsSync(appConfig.localDataDir)){
          console.log(`${appConfig.localDataDir} doesnot exist!`);
          console.log("Data dump directories Dont Exist! Exiting");
          reject("Data dump directories Dont Exist!");
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
    console.log("All config checks have passed! Starting to Consume given Queue Now!");
    ffmpegJobsQueue.getJobs(appConfig.VideoJobsType)
    .then(mjobslist => {
      console.log("Existing Jobs list:", JSON.stringify(mjobslist));
    })
    .catch(err => {
      cDebug('Error happened in querying current jobs list', err);
      process.exit();
    });
    console.log("Starting to process Queue:",appConfig.RelayServerJobsQueueName);
    relayServerJobsQueue.process(appConfig.RelayServerJobsType,jobsPath+'relayServer.js');
    console.log("Starting to process Queue:",appConfig.VideoJobsQueueName);
    ffmpegJobsQueue.process(appConfig.VideoJobsType,jobsPath+'videosaver.js');
  })
  .catch(err => {
    cDebug("Error occured during Checks!",err);
    process.exitCode=1;
  });
  
  ffmpegJobsQueue.on('completed', (job,result) => {
    console.log(`Job named ${job.name} with Job ID ${job.id} completed with result as ${JSON.stringify(result)}`);
    // TODO : send some events 
  });
  relayServerJobsQueue.on('completed', (job,result) => {
    // console.log(`Job named ${job.name} with Job ID ${job.id} having data: ${JSON.stringify(job.data)}, completed with result as ${JSON.stringify(result)}`);
    const VideoJobsType="SaveNStream";
    var saveOptions = {
			"type" : "URL",
			"value" : function(){
        let ep="http://localhost:"+result.STREAM_PORT+"/"+result.STREAM_SECRET;
        console.log(ep);
        return ep;
      }(),
      "streamParams" : result
		};

    var newJobData = Object.assign({},job.data,{"saveOptions":saveOptions});
    newJobData.videostreamOptions.restream = false;
    console.log("New Object for Video Save Job:",JSON.stringify(newJobData));
    var myjob=ffmpegJobsQueue.add(VideoJobsType, newJobData); // myjob is a promise to make a job enter in queue.
    myjob
    .then(function(mjob){ // mjob is now the job itself.
      console.log(`Job added! jobs's id is ${mjob.id}`);
      // return mjob;    
    })
    .catch(err => {
        throw new Error(err);
    });
    // TODO : send some events 
  });
})();

