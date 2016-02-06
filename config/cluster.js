module.exports = {
  numCPUs : require('os').cpus().length, // number of worker processes
  timeout : 20000   // seconds to wait after disconnect before killing the worker
                    // i.e time given to worker to complete pending requests and 
                    // and to a clean exit
};