const cluster = require('cluster');
//var numCPUs = require('os').cpus().length;
var numCPUs = 2;

cluster.setupMaster(
    {
        exec : 'server.js'
    }
);

cluster.on('message', (message) => {
    console.log("#M : received message : " + message.sender + " | " + message.msg);
});

cluster.on('disconnect', (worker) => {
    console.log("#M worker #" + worker.id + " disconnected");
});

cluster.on('exit', (worker, code, signal) => {
    if(worker.suicide == true){
        console.log("#M suidice attempt of #" + worker.id + ", code=" + code + ", signal=" + signal);
    }
    else{
        console.log("#M murder of #" + worker.id + ", code=" + code + ", signal=" + signal);
        console.log("#M spawning another worker");
        cluster.fork();
    }
});

function forkInit(){
    for(var i=0; i<numCPUs; i++){
        cluster.fork();
    }
}

function stopWorker(worker){
    console.log("#M stoppping worker " + worker.id);
    worker.disconnect();
}

process.on('SIGHUP', function(){
    var keys = Object.keys(cluster.workers);
    console.log(keys);
    stopWorker(cluster.workers[keys[0]]);
});

console.log("#M pid=" + process.pid);
forkInit();
