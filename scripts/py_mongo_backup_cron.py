import os, time

#to run every 8 hours, add following entry in crontab
#0 */8 * * * python $HOME/bin/py_mongo_backup_cron.py

ts = time.strftime("%Y-%m-%dt%H-%M", time.gmtime())
snapshot_name = 'prod-mongo-1-data-' + ts
out_file = '$HOME/bin/out_mongo_backup.out'

os.system('echo `date` >> ' + out_file)
os.system('echo "' + snapshot_name + '" >> ' + out_file)

#2>&1 redirects file descriptor 2 (stderr) to file descriptor 1 (stdout)
os.system('gcloud compute disks snapshot prod-mongo-1-data --snapshot-names ' + snapshot_name + ' --zone asia-east1-a >> ' + out_file + ' 2>&1')
