module.exports = function(job){
    'use strict';
    const ffmpeg = require('fluent-ffmpeg');
    const fs = require('fs');
    const appConfig = require('config');
    const cDebug = require('debug')('job');
    const Queue = require(appConfig.jobManager);
    const relayServerJobsQueue = new Queue(appConfig.RelayServerJobsQueueName, redisURI);


    cDebug("Worker Running Now!");
    cDebug(`Obtained job's id ${job.id} with data as :`, JSON.stringify(job.data));
    cDebug("Called with :",JSON.stringify(streamopsObject));

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


    var resolveEndpoint = new Promise(function(resolve,reject){
        if(streamopsObject.type=="local" && streamopsObject.videostreamOptions.restream==true){
            // Need the dumping http server endpoint
            // Add the relay Server Job to correspoding queue & on every job in serverjob queue completion, if job's id matches
            // then using the result which will have the SERVER port numbers, output end point is found. 
            relayServerJobsQueue.on('completed',function(job,result){
                console.log(`job completed in relayServerJobsQueue with id: ${job.id} & brought result : ${result}`);
                outputEndPoint = 'http://localhost:'+result.STREAM_PORT;
                console.log(`outputEndpoint for ffmpeg is: ${outputEndPoint}`);
                resolve(outputEndPoint);
            });
        }
        else if(streamopsObject.type=="local" && streamopsObject.videostreamOptions.restream==false && streamopsObject.saveOptions){
            var mountedDirExists=fs.existsSync(appConfig.dataDir);
            if(mountedDirExists){
                outputEndPoint = appConfig.dataDir+'/'+streamopsObject.saveOptions.filename;
            }
            else{
                outputEndPoint = './MediaOutput/'+streamopsObject.saveOptions.filename;
            }
            resolve(outputEndPoint);
        }
        else{
            console.error("Bad input given! Exiting");
            reject("Could not resolve Endpoint!");
        }    
    });

    var execJob = new Promise(function(resolve,reject){
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
            })
            .on('end', function(stdout, stderr) {
                console.log('Transcoding succeeded !');
                // raise some more GLOBAL events.
                // mcommand.kill();
                resolve(outputEndPoint);
            })
            // Operations
            .noAudio()
            .inputOptions(transportInputOptions)
            .duration(videosaveduration)
            .videoCodec(videocodecOption)
            .size(videosizeOption)
            .outputOptions(videoformatOption)
            .save(outputEndPoint);
    });

    return resolveEndpoint
    .then(execJob)
    .then( () => {
        cDebug("Job Done!");
        // return "201 Completed!";
    })
    .catch(err => {
        cDebug("Error happened in worker",err);
        reject(err);
    })
}   