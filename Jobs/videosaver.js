module.exports = function(job){
    'use strict';
    const ffmpeg = require('fluent-ffmpeg');
    const fs = require('fs');
    const appConfig = require('config');
    const cDebug = require('debug')('job');

    cDebug("Worker Running Now!");
    var execJob = new Promise(function(resolve,reject){
        cDebug(`Obtained job's id ${job.id} with data as :`, JSON.stringify(job.data));
        var maxtimeout=600;
        var streamopsObject = job.data;
        console.log("Ops Called with :",JSON.stringify(streamopsObject));
        var ffmpegOptions={
            timeout : maxtimeout,
            // logger : morgan('combined', { stream: accessLogStream })
        };// in seconds

        var transportInputOptions='-rtsp_transport '+ (streamopsObject.videostreamOptions.transport || "tcp");
        var videocodecOption = streamopsObject.videostreamOptions.codec || 'mpeg1video';
        var fpsOption = streamopsObject.videostreamOptions.fps || "auto";
        var videosizeOption = streamopsObject.videostreamOptions.videosize || "1280x720";
        var videoformatOption = '-f '+ (streamopsObject.videostreamOptions.format || "mpegts");
        var videosaveduration = parseInt(streamopsObject.saveOptions.duration) || maxtimeout;
        var outputFilename = null;
        var mountedDirExists=fs.existsSync(appConfig.dataDir);
        if(mountedDirExists){
            outputFilename = appConfig.dataDir+'/'+streamopsObject.saveOptions.filename;
        }
        else{
            outputFilename = './MediaOutput/'+streamopsObject.saveOptions.filename;
        }
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
                // console.log('Processing: ' + JSON.stringify(progress));
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
                mcommand.kill();
                resolve(outputFilename);
            })
            // Operations
            .noAudio()
            .inputOptions(transportInputOptions)
            .duration(videosaveduration)
            .videoCodec(videocodecOption)
            .size(videosizeOption)
            .outputOptions(videoformatOption)
            .save(outputFilename);
    });

    return execJob
    .then( () => {
        cDebug("Job Done!");
        // return "201 Completed!";
    })
    .catch(err => {
        cDebug("Error happened in worker",err);
        // return "ERROR!";
    })
}   