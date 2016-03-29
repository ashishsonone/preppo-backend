import os, time
import sys
import requests
from datetime import datetime
import re #regex

#to run every 24 hours, add following entry in crontab
#0 */24 * * * python $HOME/bin/py_sitemap_news_cron.py

#Manual usage with date parameter
#python <script.py> 2016-03-28
if len(sys.argv) < 2:
    print("Usage python <script.py> <path-to-ssh-key-file> [<date-string>]")
    print("\te.g 1: python py_sitemap_news_cron.py godaddy_manager.pem")
    print("\te.g 2: python py_sitemap_news_cron.py godaddy_manager.pem 2016-03-28")
    exit(0)

sshKeyFile = sys.argv[1]

dateStringArgument = None
if len(sys.argv) >= 3:
    dateStringArgument = sys.argv[2]
print("date argument " + str(dateStringArgument))

sitemapName = 'sitemap_news.txt' #fetched copy which is updated and pushed

sitemapRemoteLocation = '~/public_html/home'
sshHost = 'preppo@166.62.27.151'
scpPath = sshHost + ":" + sitemapRemoteLocation + "/" + sitemapName

#2>&1 redirects file descriptor 2 (stderr) to file descriptor 1 (stdout)
#os.system('gcloud compute disks snapshot prod-mongo-1-data --snapshot-names ' + snapshot_name + ' --zone asia-east1-a >> ' + out_file + ' 2>&1')

def getNews(date):
    r = requests.get('https://prod.api.preppo.in/v1/app/news?date=' + date)
    json = r.json()
    return json

def pullSiteMap():
    os.system("scp -i " + sshKeyFile + " " + scpPath + " " + ".")

def pushSiteMap():
    os.system("scp -i " + sshKeyFile + " " + sitemapName + " " + scpPath)

def appendToSitemap(urls):
    f = open(sitemapName, 'a') #in append mode
    for url in urls:
        f.write(url + "\n")

def getCurrentDateString():
    if dateStringArgument != None:
        return dateStringArgument

    now = datetime.now()
    dateString = now.strftime("%Y-%m-%d")
    #dateString = "2016-03-28"
    #x = datetime.strptime("2016-03-03", "%Y-%m-%d")
    #x.strftime("%Y-%m-%d")
    return dateString

def formUrl(date, heading, newsId):
    #https://preppo.in/news/2016-03-29/Narendra-Modi-to-launch-'Stand-Up-India'-scheme-on-April-5/?l=e&id=56fa332436989a3a2337f572
    heading = heading.replace(' ', '-') #replace <space> with <dash>
    heading = re.sub('[^\w\-]', '', heading) #remove all non-alphanumeric chars(except -)

    url = "https://preppo.in/news/" + date + "/" + heading + "/?l=e&id=" + newsId
    #print(url)
    return url

def generateUrls():
    today = getCurrentDateString()
    print("Fetching news items for date " + today)
    newsItems = getNews(today)
    print("Fetched #items = " + str(len(newsItems)))
    urls = []
    for item in newsItems:
        englishHeading = item['content']['english']['heading']
        newsId = item['_id']
        url = formUrl(today, englishHeading, newsId)
        #print(url)
        urls.append(url)
    return urls

def work():
    pullSiteMap()
    urls = generateUrls()
    appendToSitemap(urls)
    pushSiteMap()

#print("len=" + str(len(getNews('2016-03-28'))))
#pullSiteMap()
#pushSiteMap()
#appendToSitemap(['https://preppo.in/dashboard/quiz', 'https://preppo.in/dashboard/updates'])
#print(getCurrentDateString())
#formUrl('2016-03-28', "According to the Delhi Budget 2016- the government is all set to cut VAT", "56f80a9580d4a44423d57a8e")
#generateUrls()

work() #main worker
