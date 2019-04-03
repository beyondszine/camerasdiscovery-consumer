# camerasdiscovery-jobconsumer
This is the BULL consumer for the long running jobs given for 'ffmpeg-as-a-service' jobs by camerasdiscovery.  All tasks like saving,streaming,transcoding etc are consumed as jobs are managed using BULL nodejs framework.


## Configuration: Consumer Jobs processing
__Advanced Settings__

__Warning:__ Do not override these advanced settings unless you understand the internals of the queue.

`lockDuration`: Time in milliseconds to acquire the job lock. Set this to a higher value if you find that your jobs are being stalled because your job processor is CPU-intensive and blocking the event loop (see note below about stalled jobs). Set this to a lower value if your jobs are extremely time-sensitive and it might be OK if they get double-processed (due to them be falsly considered stalled).

`lockRenewTime`: Interval in milliseconds on which to acquire the job lock. It is set to `lockDuration / 2` by default to give enough buffer to renew the lock each time before the job lock expires. It should never be set to a value larger than `lockDuration`. Set this to a lower value if you're finding that jobs are becoming stalled due to a CPU-intensive job processor function. Generally you shouldn't change this though.

`stalledInterval`: Interval in milliseconds on which each worker will check for stalled jobs (i.e. unlocked jobs in the `active` state). See note below about stalled jobs. Set this to a lower value if your jobs are extremely time-sensitive. Set this to a higher value if your Redis CPU usage is high as this check can be expensive. Note that because each worker runs this on its own interval and checks the entire queue, the stalled job actually run much more frequently than this value would imply.

`maxStalledCount`: The maximum number of times a job can be restarted before it will be permamently failed with the error `job stalled more than allowable limit`. This is set to a default of `1` with the assumption that stalled jobs should be very rare (only due to process crashes) and you want to be on the safer side of not restarting jobs. Set this higher if stalled jobs are common (e.g. processes crash a lot) and it's generally OK to double process jobs.

`guardInterval`: Interval in milliseconds on which the delayed job watchdog will run. When running multiple concurrent workers with delayed tasks, the default value of `guardInterval` will cause spikes on network bandwidth, cpu usage and memory usage. Each concurrent worker will run the delayed job watchdog. In this case set this value to something much higher, e.g. `guardInterval = numberOfWorkers*5000`. Set to a lower value if your Redis connection is unstable and delayed jobs aren't being processed in time.

`retryProcessDelay`: Time in milliseconds in which to wait before trying to process jobs, in case of a Redis error. Set to a lower value on an unstable Redis connection.

`backoffStrategies`: An object containing custom backoff strategies. The key in the object is the name of the strategy and the value is a function that should return the delay in milliseconds. For a full example see [Patterns](./PATTERNS.md#custom-backoff-strategy).

`drainDelay`: A timeout for when the queue is in `drained` state (empty waiting for jobs). It is used when calling `queue.getNextJob()`, which will pass it to `.brpoplpush` on the Redis client.

```js
backoffStrategies: {
  jitter: function () {
    return 5000 + Math.random() * 500;
  }
}
```

---


Src:
-   https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md



## <a id="License"> License</a>

The MIT License (MIT)

Copyright (c) @ Saurabh Shandilya

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
