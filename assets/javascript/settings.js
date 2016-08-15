var settings = {}

function initSettings() {
  if ( !loadSettings() ) {
    displaySettings();
  }
  else {
    $('#mint_arks').prop('checked', settings['mint_arks']);
    updateMinterButton(settings['mint_arks']);
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

function toggleMinter() {
  var check = !$('#mint_arks').prop('checked');
  $('#mint_arks').prop('checked', check);
  
  updateMinterButton(check);

  settings['mint_arks'] = check;
  localStorage.setItem("settings", JSON.stringify(settings));
}

function updateMinterButton(state) {
  $('.automint').removeClass('on').removeClass('off');
  $('.automint').addClass(state ? 'on' : 'off');
  $('.automint .status').text(state ? 'on' : 'off');
}