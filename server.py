from flask import Flask, render_template, request, abort, jsonify
import requests
from lxml import etree

import os
import time

DEBUG = False

app = Flask(__name__)

app.add_url_rule("/<path:filename>", view_func=app.send_static_file, endpoint="static")

def monit(host, data):
  response = requests.get("http://" + host + ":2812/_status?format=xml")
  service_name = data.get("serviceName", "")

  if response.status_code == 200:
    ok = True
    parser = etree.XMLParser(ns_clean=True, recover=True, encoding='utf-8')
    doc = etree.fromstring(str(response.text), parser=parser)
    if "system_" in service_name: # this is a system
      server = doc.findall("server")[0]

      uptime = round(int(server.findall("uptime")[0].text) / 3600.0, 1)
      uptime = str(uptime) + "hr"
      for service in doc.findall("service"):
        if service.get("type") == "5" and service.findall("name")[0].text == service_name:
          break

      status = service.findall("status")[0].text
      updated = int(service.findall("collected_sec")[0].text)
      load = service.findall("system")[0].findall("load")[0].findall("avg05")[0].text
      memory = service.findall("system")[0].findall("memory")[0]
      memory_percent = memory.findall("percent")[0].text
      memory_megabyte = round(int(memory.findall("kilobyte")[0].text) / 1024.0, 2)
      memory = "{}% ({} MB)".format(memory_percent, memory_megabyte)

      extra_data = {
        "updatedAt": updated,
        "items": [
          {"label": "Host", "value": host},
          {"label": "Load", "value": load},
          {"label": "Memory", "value": memory},
          {"label": "Uptime", "value": uptime}
        ]
      }
    else: # some monit services..
      for service in doc.findall("service"):
        if service.get("type") == "3" and service.findall("name")[0].text == service_name:
          break

      status = service.findall("status")[0].text
      updated = int(service.findall("collected_sec")[0].text)
      cpu = service.findall("cpu")[0].findall("percent")[0].text
      memory = service.findall("memory")[0]
      memory_percent = memory.findall("percent")[0].text
      memory_megabyte = round(int(memory.findall("kilobyte")[0].text) / 1024.0, 2)
      memory = "{}% ({} MB)".format(memory_percent, memory_megabyte)
      extra_data = {
        "items": [
          {"label": "Host", "value": host},
          {"label": "CPU", "value": cpu},
          {"label": "Memory", "value": memory},
        ],
        "updatedAt": updated
      }

    if status != "0":
      ok = False
      extra_data["items"].append({"label": "Status Code", "value": status})

  else:
    ok = False
    extra_data = {"status_code": response.status_code}

  return ok, extra_data

def ping(host, data):
  # HOLY SHIT. this is terrible in terms of security.
  # however... we only run on localhost..
  response = os.system("ping -c 1 " + host)
  if response == 0:
    ok = True
  else:
    ok = False
  return ok, {"updatedAt": int(time.time()), "items": [{"label": "Host", "value": host}]}

# returns up/down, extra_data
monitors = {
  "monit": monit,
  "ping": ping
}

@app.route("/")
def main():
  return render_template("home.html")

@app.route("/status")
def status():
  host = request.args.get("ip")
  monitor = request.args.get("monitor", "ping")
  monitor = monitors.get(monitor, None)
  if monitor is None:
    return abort(400)

  ok, data = monitor(host, request.args)
  if ok:
    data.setdefault("items", []).insert(0, {"label": "Status", "value": "OK"})
    data["backgroundColor"] = "green"
    return jsonify(data)
  else:
    data.setdefault("items", []).insert(0, {"label": "Status", "value": "Down"})
    data["backgroundColor"] = "red"
    return jsonify(data), 503

if __name__ == "__main__":
  if DEBUG:
    app.run(debug=True, host="localhost", port=3128)
  else:
    from gevent.wsgi import WSGIServer
    server = WSGIServer(("localhost", 3128), app)
    server.serve_forever()
