const {dialog} = require('electron').remote;
var xlsx = require('xlsx');

/**
 * Setups the drag-n-drop function
 */
$(document).ready(function(){

  /** Prevent window from doing default drag and drop actions **/
  $(document).on('dragenter dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  $(document).on('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  $('#dnd').on('dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  $('#dnd').on('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $('#dnd').addClass('draghover');
  });
  $('#dnd').on('dragleave', function(e){
    $('#dnd').removeClass('draghover');
  });
  $('#dnd').on('drop', function(e){
    e.stopPropagation();
    e.preventDefault();

    var files = e.originalEvent.dataTransfer.files;

    logger.clear();

    for (var i = 0, f = files[i]; i !== files.length; ++i){
      process_dnd_file(f);
    }
  });
});

/**
 * Opens the open file dialog to process a metadata file.
 */
function openFile() {
  logger.clear();
  dialog.showOpenDialog({ filters: [
    { name: 'Excel File', extensions: ['xlsx'] }
  ]},
  function (filenames){
    if (filenames === undefined) return;
    for (var k in filenames) {
      if ({}.hasOwnProperty.call(filenames, k)) {
        process_open_file(filenames[k]);
      }
    }
  });
}

/**
 * Reads in a xlsx file for processing metadata.
 *
 * @param Object f The file object
 */
function process_dnd_file(f) {
  var reader = new FileReader();
  var name = f.name;
  reader.onload = function(e) {
    var data = e.target.result;

    try {
      logger.log('Reading file: ' + f.path);
      var workbook = xlsx.read(data, {type: 'binary'});
    }
    catch (err) {
      logger.error('Error reading file: ' + err.message);
      dialog.showErrorBox("File Error", err.message);
      return;
    }
    
    process_workbook(workbook, f.path);
  };
  reader.readAsBinaryString(f);
}

/**
 * Reads in a xlsx file for processing metadata.
 *
 * @param String filename The files full path
 */
function process_open_file(filename) {
  try {
    logger.log('Reading file: ' + filename);
    var workbook = xlsx.readFile(filename);
  }
  catch (err) {
    logger.error('Error reading file: ' + err.message);
    dialog.showErrorBox('Error reading file: ' + err.message);
    return;
  }
  process_workbook(workbook, filename);
}