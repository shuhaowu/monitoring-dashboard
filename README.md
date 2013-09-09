This is my personal monitoring dashboard. Maybe it will be of help for you.

My servers uses monit to monitor services and so forth. This taps into the XML
dump from monit.

This also uses ping to monitor things and is very insecure because it utilizes
`os.system`. Therefore you should only make this accessible on localhost, as it
do by default.

To run this, you need to copy settings.js-dist to settings.js inside the static
folder. Also need a python and a virtualenv with the requirements.txt
installed.

This is currently not really done.. but whatever. 

Optimized for 1080p screens.

Screenie: 

![Screenie~](http://i.imgur.com/zZuQ7yj.png)