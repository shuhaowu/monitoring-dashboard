Dashing.gridsterLayout('[{"col":2,"row":1},{"col":1,"row":1},{"col":3,"row":1},{"col":2,"row":2},{"col":3,"row":2},{"col":1,"row":2},{"col":5,"row":1},{"col":4,"row":2},{"col":2,"row":3}]');
Dashing.widget_base_dimensions = [370, 340];
Dashing.numColumns = 5;

var UNKNOWN_COLOR = "rgb(236, 102, 60)";
var OK_COLOR = "green";
var ERROR_COLOR = "red";

Dashing.on("ready", function() {

  function updateWidget(id, data) {
    Dashing.widgets[id][0].receiveData(data);
    Dashing.widgets[id][0].node.style.backgroundColor = data.backgroundColor;
  }

  var Services = {};

  for (var id in Systems) {
    if (!Systems.hasOwnProperty(id)) continue;
    var name = id.charAt(0).toUpperCase() + id.slice(1);
    var items = [
      {label: "Status", value: "Unknown"},
      {label: "Host", value: Systems[id].ip}
    ];
    if (Systems[id].monitor == "monit") {
      items.push({label: "CPU", value: "Unknown"});
      items.push({label: "Memory", value: "Unknown"});
      items.push({label: "Uptime", value: "Unknown"});
    }
    updateWidget(id, {
      items: items,
      unordered: true,
      title: name,
      backgroundColor: UNKNOWN_COLOR
    });

    if (Systems[id].services) {
      for (var i=0; i<Systems[id].services.length; i++) {
        var sid = id + Systems[id].services[i];
        Services[sid] = {
          ip: Systems[id].ip,
          serviceName: Systems[id].services[i],
          monitor: "monit"
        };

        updateWidget(sid, {
          items: [
            {label: "Status", value: "Unknown"},
            {label: "Host", value: Systems[id].ip},
            {label: "CPU", value: "Unknown"},
            {label: "Memory", value: "Unknown"},
            {label: "Uptime", value: "Unknown"}
          ],
          title: Systems[id].services[i] + "@" + name,
          backgroundColor: UNKNOWN_COLOR,
          unordered: true
        });
      }
    }
  }

  function updateAllSystems() {
    console.log("Updating all systems");
    var allSystems = [];

    var updateOne = function(id, system) {
      var req = $.ajax({
        url: "/status",
        data: system,
        dataType: "json"
      });

      if (id in CriticalSystems)
        allSystems.push(req);

      req.done(function(data) {
        updateWidget(id, data);
      });

      req.fail(function(xhr) {
        try {
          var data = JSON.parse(xhr.responseText);
          data.title = id.charAt(0).toUpperCase() + id.slice(1);
          updateWidget(id, data);
        } catch (e) {
          updateWidget(id, {title: "ERROR!!", backgroundColor: ERROR_COLOR, updatedAt: (new Date()).getTime() / 1000});
          console.log(e);
        }
      });
    };

    for (var id in Systems) {
      if (!Systems.hasOwnProperty(id)) continue;
      updateOne(id, Systems[id]);
    }

    for (var id in Services) {
      if (!Services.hasOwnProperty(id)) continue;
      updateOne(id, Services[id]);
    }

    var critical = $.when.apply($, allSystems);
    critical.then(
      function() {
        updateWidget("overall", {text: "OK", backgroundColor: OK_COLOR});
        console.log("critical done");
      },
      function () {
        updateWidget("overall", {text: "Down", backgroundColor: ERROR_COLOR});
        console.log("critical fail");
      }
    );
  };

  updateAllSystems();
  setInterval(updateAllSystems, 60000);

});
