var settings = {}

function initSettings() {
  if ( !loadSettings() ) {
    displaySettings();
  }
}

function loadSettings() {
  var data = localStorage.getItem("settings");
  if ( data === undefined || data === null ) {
    settings = {};
    return false;
  }
  settings = JSON.parse(data);
  return true;
}

function saveSettings() {
  $('#settings form input[type=text]').each(function(){
    settings[$(this).attr("id")] = $(this).val();
  });

  $('#settings form input[type=checkbox]').each(function(){
    settings[$(this).attr("id")] = $(this).prop('checked');
  });

  localStorage.setItem("settings", JSON.stringify(settings));

  closeSettings();
}

function closeSettings() {
  $('#settings').animate({
    opacity: 0,
    top: "-300px"
  }, 400, function(){
    $(this).hide();
  });
}

function displaySettings() {
  $.each(settings, function( key, value) {
    if (typeof value === "boolean") {
      $('#settings input[id=' + key + ']').prop('checked', value);
    }
    else {
      $('#settings input[id=' + key + ']').val(value);
    }
  });
  $('#settings').animate({
    opacity: 1,
    top: "0px"
  });
  $('#settings').show();
}

function toggleSwitch(s) {
  var checkbox = $(s).find('input [type=checkbox]');
  checkbox.prop('checked', !checkbox.prop('checkbox'));
}