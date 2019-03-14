// 'use strict';
const Queue = require('bull');
const myFirstQueue = new Queue('VideoSaveJobs', 'redis://127.0.0.1:6379');
// const minProgressUpdatePeriodMs = 1000;

// myFirstQueue.process('delayedJobRunner', (job, done) => {
//   console.log("Obtained job's id is:",job.id);
//   console.log('Obtained data is:', job.data);
//   return randomDelayedGreeting(job, done);
// });

myFirstQueue.process('VideoJobRunner','/home/beyond/nodejs/bulltry/videosaver.js');


myFirstQueue.on('completed', (job,result) => {
  console.log(`Job named ${job.name} with Job ID ${job.id} completed with result as ${result}`);
});

// function getRandomInt(max) {
//   const mRandom = Math.random();
//   if (mRandom != 0) {
//     return Math.floor(Math.random() * Math.floor(max));
//   } else {
//     console.log('random got zero itself! going recursive!');
//     getRandomInt(max);
//   }
// }

// function randomDelayedGreeting(mjob, done) {
//   console.log(`from randomDelayed Greeting No: ${mjob.id}, data sent was ${mjob.data}`);
//   const mydelay = getRandomInt(20);
//   let progPercent = 100 / mydelay;
//   console.log(`random delay selected: ${mydelay}`);
//   const progressUpdater = setInterval(() => {
//     progPercent += 100/mydelay;
//     console.log(`    sending progress udpate => ${progPercent}`);
//     mjob.progress(progPercent);
//   }, minProgressUpdatePeriodMs);

//   setTimeout(() => {
//     console.log('Delay thing over finally!!');
//     console.log(`Secret data sent was ${mjob.data}`);
//     clearInterval(progressUpdater);
//     done();
//   }, mydelay * 1000);
// }
