module.exports = function(job){
    'use strict';
    const ffmpeg = require('fluent-ffmpeg');
    console.log("Loaded fluent-ffmpeg");
    const fs = require('fs');
    console.log("Loaded fs");
    const appConfig = require('config');
    const cDebug = require('debug')('job');
    const Queue = require(appConfig.jobManager);
    const path = require('path');
    const redisURI = 'redis://192.168.1.119:6379';
    const relayServerJobsQueue = new Queue(appConfig.RelayServerJobsQueueName, redisURI);

    console.log("Worker Running Now!");
    console.log(`Obtained job's id ${job.id} with data as :`, JSON.stringify(job.data));
    var maxtimeout=600;
    var streamopsObject = job.data;
    var ffmpegOptions={
        timeout : maxtimeout  // in seconds
    };

    var transportInputOptions='-rtsp_transport '+ (streamopsObject.videostreamOptions.transport || "tcp");
    var videocodecOption = streamopsObject.videostreamOptions.codec || 'mpeg1video';
    var fpsOption = streamopsObject.videostreamOptions.fps || "auto";
    var videosizeOption = streamopsObject.videostreamOptions.videosize || "1280x720";
    var videoformatOption = '-f '+ (streamopsObject.videostreamOptions.format || "mpegts");
    var videosaveduration = parseInt(streamopsObject.saveOptions.duration) || maxtimeout;
    var outputEndPoint = null;


    var resolveEndpoint = function(){
        return new Promise(function(resolve,reject){
            console.log('Executing: resolveEndpoint Promise');
            var endpoint;
            if(streamopsObject.type=="local" && streamopsObject.videostreamOptions.restream==false){
                console.log("local & false");
                if( (streamopsObject.saveOptions.type == "FILE") || (streamopsObject.saveOptions.type == "file") || (streamopsObject.saveOptions.type == "File") ){
                    var mountedDirExists=fs.existsSync(appConfig.dataDir);
                    if(mountedDirExists){
                        console.log(`${appConfig.dataDir} Exists`);
                        endpoint = appConfig.dataDir+'/'+streamopsObject.saveOptions.filename;
                        console.log("Resolving resolveEndpoint Promise with",endpoint);
                        resolve(endpoint);
                    }
                    else{
                        // let t = path.join(__dirname,'/Media') +streamopsObject.saveOptions.filename
                        console.log(`${appConfig.dataDir} Does NOT Exists, Saving in Local folder!`);
                        endpoint = path.join(__dirname,'../Media/') + streamopsObject.saveOptions.filename;
                        console.log("Endpoint: ",endpoint);
                        console.log("Resolving resolveEndpoint Promise with",endpoint);
                        resolve(endpoint);
                    }
                }
                else if(streamopsObject.saveOptions.type == "URL" || (streamopsObject.saveOptions.type == "Url") || (streamopsObject.saveOptions.type == "url")){
                    endpoint=streamopsObject.saveOptions.value;
                    resolve(endpoint);
                }
                else{
                    console.error("Bad input given! Exiting");
                    reject("Unesolvable Endpoint!");
                }
            }
            else{
                console.error("Bad input given! Exiting");
                reject("Could not resolve Endpoint!");
            }    
        });
    };

    var execJob = function(endPoint){
        return new Promise(function(resolve,reject){
            var mcommand=ffmpeg(ffmpegOptions);
            mcommand
            .input(streamopsObject.url)
            .on('start', function(commandLine) {
                console.log('Spawned Ffmpeg with command: ' + commandLine);
            })
            .on('codecData', function(data) {
                console.log('Input is ' + data.audio + ' audio ' +
                'with ' + data.video + ' video');
            })
            .on('progress', function(progress) {
                // Stopping at Max file size restriction.
                let ptsize=parseInt(progress.targetSize)/1024;
                let maxfsize=parseInt(streamopsObject.saveOptions.maxfilesize);
                console.log(`target size: ${ptsize}, Output Maxfilesize: ${maxfsize}, Total Max. Time: ${streamopsObject.saveOptions.duration}`);
                if( ptsize > maxfsize ){
                    console.log("Output fulfilled size. Exiting!!");
                    console.log('Progress Data: ' + JSON.stringify(progress));
                    mcommand.emit('end');
                }
                // TODO: update job's progress by getting ffprobe on video stream & send stats via getting video native frame rate wrt current done i.e progress.frames.
            })
            .on('stderr', function(stderrLine) {
                console.log('Stderr output: ' + stderrLine);
            })
            .on('error', function(err, stdout, stderr) {
                var emsg=err.message.split(':')[3];
                var error_msg={
                    "_status" : "ERR",
                    "_message": emsg
                };
                console.log('Error:' + JSON.stringify(err.message));
                reject(err);
            })
            .on('end', function(stdout, stderr) {
                console.log('Transcoding succeeded !');
                // raise some more GLOBAL events.
                // mcommand.kill();
                resolve(endPoint);
            })
            // Operations
            .noAudio()
            .inputOptions(transportInputOptions)
            .duration(videosaveduration)
            .videoCodec(videocodecOption)
            .size(videosizeOption)
            .outputOptions(videoformatOption)
            .save(endPoint);
        });
    };

    return resolveEndpoint()
    .then(execJob)
    .then( () => {
        cDebug("Job Done!");
        // return "201 Completed!";
    })
    .catch(err => {
        cDebug("Error happened in worker",err);
    });
}   