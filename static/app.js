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

  for (var id in Systems) {
    if (!Systems.hasOwnProperty(id)) continue;
    var name = id.charAt(0).toUpperCase() + id.slice(1);
    var items = [
      {label: "IP", value: Systems[id].ip},
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
  }

  function updateAllSystems() {
    console.log("Updating all systems");
    var allSystems = [];
    for (var id in Systems) {
      if (!Systems.hasOwnProperty(id)) continue;
      var req = $.ajax({
        url: "/status",
        data: Systems[id],
        dataType: "json"
      });

      if (id in CriticalSystems)
        allSystems.push(req);

      (function(id) {
        req.done(function(data) {
          updateWidget(id, data);
        });
      })(id);

      (function(id) {
        req.fail(function(xhr) {
          try {
            var data = JSON.parse(xhr.responseText);
            updateWidget(id, data);
          } catch (e) {
            updateWidget(id, {title: "ERROR!!"});
          }
        });
      })(id);
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
  setInterval(updateAllSystems, 30000);

});