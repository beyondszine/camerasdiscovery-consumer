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
		WebSocket = require('ws'),
		getPort = require('get-port');

	var STREAM_SECRET,
		STREAM_PORT,
		WEBSOCKET_PORT,
		RECORD_STREAM;

	var socketServer;
	var streamServer;

	var createParams = new Promise(async function(resolve,reject){
		console.log("Creating params for the job: WS & HTTP Ports & secret!");
		STREAM_SECRET = job.id ;
		try{
			RECORD_STREAM = false ;
			// STREAM_PORT = await getPort( {port: getPort.makeRange(10000, 20000) } );
			// WEBSOCKET_PORT  = await getPort( {port: getPort.makeRange(10000, 20000) } );	
			console.log(`Create Params being resolved for following: STREAM_SECRET:${STREAM_SECRET}, RECORD_STREAM: ${RECORD_STREAM}`);
			resolve();
		}
		catch(err){
			console.log("Error while grabbing free port",err.message);
			reject(err.message);
		}
	});

	// Websocket Server
	var runRelayWSServer = function(){
		return new Promise(async function(resolve,reject){
			WEBSOCKET_PORT  = await getPort( {port: getPort.makeRange(10000, 20000) } );
			console.log("Creating new WS server on Port",WEBSOCKET_PORT);
			if(WEBSOCKET_PORT != ""){
				try{
					socketServer = new WebSocket.Server({port: WEBSOCKET_PORT, perMessageDeflate: false});
				}
				catch(err){
					console.log("Error while creating WS server",err.message);
					throw new Error(merr_res);
				}
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
					// reject(merr_res);
					throw new Error(merr_res);
				});

				socketServer.on('listening',function(websocketserver){
					console.error("Successfully bound with port: ",WEBSOCKET_PORT);
					// return;
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
			}
			else{
				reject("No WS port Obtained!!");
			}
		});
	};


	var runRelayHTTPServer = function(){
		return new Promise(async function(resolve,reject){
			STREAM_PORT = await getPort( {port: getPort.makeRange(10000, 20000) } );
			console.log("Creating new HTTP server on Port",STREAM_PORT);
			// HTTP Server to accept incomming MPEG-TS Stream from ffmpeg
			if(STREAM_PORT != ""){
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
					throw new Error(merr_res);
				})
				.listen(STREAM_PORT, function(){
					console.error("Successfully bound with port: ",STREAM_PORT);
					resolve();
				});
			}
			else{
				console.log("No port obtained for HTTP server!");
				reject("No port obtained for HTTP server!");	
			}
		});
	};


	return Promise.all([createParams,runRelayHTTPServer(),runRelayWSServer()])
	.then( () => {
		console.log("Both servers started!");
		let resolve_resp = {
			"_status": "OK",
			"STREAM_SECRET": STREAM_SECRET,
			"STREAM_PORT" : STREAM_PORT,
			"WEBSOCKET_PORT" : WEBSOCKET_PORT,
			"RECORD_STREAM": RECORD_STREAM
		};
		console.log(resolve_resp);
		return resolve_resp;
	})
	.catch(err => {
		console.log("Error happened during main Promise chain!",err.message);
	});

}