// Use the websocket-relay to serve a raw MPEG-TS over WebSockets. You can use
// ffmpeg to feed the relay. ffmpeg -> websocket-relay -> browser
// Example:
// node websocket-relay yoursecret 8081 8082
// ffmpeg -i <some input> -f mpegts http://localhost:8081/yoursecret
//  ffmpeg -rtsp_transport tcp -i "rtsp://192.168.1.99/live/av0?user=beyond&passwd=abcd1234" -f mpegts -codec:v mpeg1video -bf 0 -codec:a mp2 -r 30 http://localhost:8081/mysecret
module.exports = function(job){
    'use strict';
	var fs = require('fs'),
		http = require('http'),
		WebSocket = require('ws');

	var STREAM_SECRET,
		STREAM_PORT,
		WEBSOCKET_PORT,
		RECORD_STREAM;

	var socketServer;
	var streamServer;

	var validationjobInputs = new Promise(function(resolve,reject){
		console.log("validation running for job port & secret checking inputs!")
		if(job.data.STREAM_SECRET && job.data.STREAM_PORT && job.data.WEBSOCKET_PORT ){
			STREAM_SECRET = job.data.STREAM_SECRET,
			STREAM_PORT = job.data.STREAM_PORT,
			WEBSOCKET_PORT = job.data.WEBSOCKET_PORT,
			RECORD_STREAM = job.data.RECORD_STREAM;
			resolve();
		}
		else{
			reject("Incomplete options given!");
		}
		
	});

	// Websocket Server
	var runRelayWSServer = new Promise(function(resolve,reject){
		socketServer = new WebSocket.Server({port: WEBSOCKET_PORT, perMessageDeflate: false});
		socketServer.connectionCount = 0;
		socketServer.on('connection', function(socket, upgradeReq) {
			socketServer.connectionCount++;
			console.log(
				'New WebSocket Connection: ', 
				(upgradeReq || socket.upgradeReq).socket.remoteAddress,
				(upgradeReq || socket.upgradeReq).headers['user-agent'],
				'('+socketServer.connectionCount+' total)'
			);

			socket.on('close', function(code, message){
				socketServer.connectionCount--;
				console.log(
					'Disconnected WebSocket ('+socketServer.connectionCount+' total)'
				);
				console.log("disconnected one was: ",socket);
			});
		});

		socketServer.on('error',function(websocketerr){
			console.error("Error occured while binding with port",websocketerr);
			let merr_res=`WS Server Could not bind to ${WEBSOCKET_PORT}`;
			reject(merr_res);
		});

		socketServer.on('listening',function(websocketserver){
			console.error("Successfully bound with port: ",WEBSOCKET_PORT);
			resolve();
			// process.send('Awaiting WebSocket connections on ws://127.0.0.1:'+WEBSOCKET_PORT+'/');
		});

		socketServer.broadcast = function(data) {
			socketServer.clients.forEach(function each(client) {
				if (client.readyState === WebSocket.OPEN) {
					client.send(data);
				}
			});
		};
	});


	var runRelayHTTPServer = new Promise(function(resolve,reject){
		// HTTP Server to accept incomming MPEG-TS Stream from ffmpeg
		streamServer = http.createServer( function(request, response) {
			var params = request.url.substr(1).split('/');
			if (params[0] !== STREAM_SECRET) {
				console.log(
					'Failed Stream Connection: '+ request.socket.remoteAddress + ':' +
					request.socket.remotePort + ' - wrong secret.'
				);
				response.end();
			}
			response.connection.setTimeout(0);
			console.log(
				'Stream Connected: ' + 
				request.socket.remoteAddress + ':' +
				request.socket.remotePort
			);
			request.on('data', function(data){
				socketServer.broadcast(data);
				if (request.socket.recording) {
					request.socket.recording.write(data);
				}
			});
			request.on('end',function(){
				console.log('close');
				if (request.socket.recording) {
					request.socket.recording.close();
				}
			});

			// Record the stream to a local file?
			if (RECORD_STREAM) {
				var path = 'recordings/' + Date.now() + '.ts';
				request.socket.recording = fs.createWriteStream(path);
			}
		});

		streamServer
		.on('error', function(httpservererror){
			console.error("Error occured while binding with port",httpservererror);
			let merr_res=`HTTP Server Could not bind to ${STREAM_PORT}`;
			reject(merr_res);
		})
		.listen(STREAM_PORT, function(){
			console.error("Successfully bound with port: ",STREAM_PORT);
			resolve();
			// process.send('Awaiting WebSocket connections on ws://127.0.0.1:'+STREAM_PORT+'/');
		});
	});


	return validationjobInputs
	.then(runRelayHTTPServer)
	.then(runRelayWSServer)
	.then( () => {
		console.log("Both servers started!");
		let resolve_resp = {
			"_status": "OK",
			"STREAM_SECRET": STREAM_SECRET,
			"STREAM_PORT" : STREAM_PORT,
			"WEBSOCKET_PORT" : WEBSOCKET_PORT,
			"RECORD_STREAM": RECORD_STREAM
		}
		resolve(resolve_resp);
	})
	.catch(err => {
		console.log("Error happened!",err.message);
		reject({"_status":"ERROR", "_msg":err.message});
	});

}