echo "rolling update to node process by kill -1 <node_pid>"
cd ~/preppo-backend
pwd
npm install
sudo kill -1  `sudo supervisorctl status | grep node | awk -F' ' '{print $4}' | sed -e 's/,$//' | paste -sd' '`

