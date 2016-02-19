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

echo "installing redis-server from ppa:chris-lea"
#install redis-server (download source and install)
#apt-get : -y (assume yes), -q (quiet)
sudo add-apt-repository ppa:chris-lea/redis-server -y
sudo apt-get -q update
sudo apt-get install -yq redis-server

echo "stopping redis service and disable on startup"
#disable start on boot
sudo service redis-server stop
sudo update-rc.d redis-server disable

echo "creating directories"
#create log directory
LOG_DIR=/var/log/redis
rm -r /var/log/redis
mkdir -p $LOG_DIR
chown -R mongodb:mongodb $LOG_DIR
chmod -R 775 $LOG_DIR

#create working directory
WORK_DIR=/home/ashish/redis
mkdir -p $WORK_DIR
chown -R mongodb:mongodb $WORK_DIR
chmod -R 775 $WORK_DIR

echo "configuring supervisor"
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
supervisorctl restart redis
supervisorctl status
