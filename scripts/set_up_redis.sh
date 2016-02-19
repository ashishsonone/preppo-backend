#Run this over ssh
#   ssh serverA "sudo bash -s" < ./set_up_redis.sh yahoo
#e.g for gcloud
#   gcloud compute ssh dev-mongo-1 "sudo bash -s" < ./set_up_redis.sh 'hello-world!'
#
#Prerequesites:
#   the sshed user(here 'ashish') has permission to run all commands on the system as sudo without being asked for password
#   the system already has supervisor installed
#   user by the name 'mongo' - we will run redis with this user
#   directory /home/ashish exists

#can pass arguments if like
echo $1

#install redis-server
#apt-get : -y (assume yes), -q (quiet)
apt-get -yq install redis-server

#create log directory
LOG_DIR=/var/log/redis
mkdir -p $LOG_DIR
chown -R mongodb:mongodb $LOG_DIR

#create working directory
WORK_DIR=/home/ashish/redis
mkdir -p $WORK_DIR

#create supervisor conf file for redis
cat > /etc/supervisor/conf.d/redis.conf << EOF
[program:redis]
command=redis-server --save "" --maxmemory 100000001 --maxmemory-policy volatile-ttl --bind 0.0.0.0
directory=/home/ashish/redis
autostart=true
autorestart=true
startretries=3
stderr_logfile=/var/log/redis/redis.err.log
stdout_logfile=/var/log/redis/redis.out.log
user=mongodb
environment=SECRET_PASSPHRASE='this is secret',SECRET_TWO='another secret'
EOF

#update supervisor
supervisorctl reread
supervisorctl update
supervisorctl status redis
