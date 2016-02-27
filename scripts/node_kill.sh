echo "checking out given tag and doing a rolling update by kill -1 <node_pid>"
cd ~/preppo-backend
git checkout $1
pwd
npm install
sudo kill -1  `sudo supervisorctl pid node`