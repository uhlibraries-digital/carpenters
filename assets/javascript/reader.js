/**
 * reader.js
 *
 * Reads in a well formated xlsx to produce a CSV for ingest into Archivematica and DAMS
 */
var xlsx = require('xlsx');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var stringify = require('csv-stringify');
var BCollection = require('./assets/javascript/dp_model.js');

var metadata_array = [];
var locationpath = '';
var subdir = 'ingest';
var process_counter = 0;
var process_total = 0;
var rolling_back = false;

/**
 * Pad to the left side of the string
 *
 * @param String str The string being padded
 * @param Int l The new string length
 * @param String c The character to pad
 * @return String
 */
function padLeft(str, l, c) {
  return Array(l-str.length+1).join(c||" ")+str;
}

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
 * Turns a xlsx worksheet object into a array containing metadata objects and files.
 *
 * @param Object worksheet
 * @return Array
 */
function build_metadata_array(worksheet) {
  var range = xlsx.utils.decode_range(worksheet['!ref']);

  var collection;
  var collections = [];
  var headers = [];
  for ( var R = range.s.r; R <= range.e.r; ++R ) {
    var item = {};
    for ( var C = range.s.c; C <= range.e.c; ++C ) {
      var cell = xlsx.utils.encode_cell({r: R, c: C});
      
      if ( R === 0 ) {
        headers[C] = worksheet[cell].v;
      }
      else {
        item[headers[C]] = ((worksheet[cell] !== undefined) ? worksheet[cell].v : '');
      }
    }

    if ( R > 0 ) {
      if ( item["COLL"] === 'x' ) {
        if (collection !== undefined) {
          collections.push(collection);
        }
        collection = new BCollection(item["dc.title"]);
      }
      else if ( item["BOX"] === 'x' ) {
        if ( collection === undefined ) {
          logger.warn("There doesn't seem to be a collection level. I'll keep going assuming there isn't one");
          collection = new BCollection();
        }
        collection.addBox(item["dc.title"]);
      }
      else if ( item["FOLDER"] === 'x' ) {
        collection.addFolder(item["dc.title"]);
      }
      else if ( item["OBJECT"] === 'x' ) {
        process_total++;
        
        collection.addObject(item);
      }
      else if ( item["FILE"] === 'x' ) {
        collection.addFile(item);
      }
    }
  }

  collections.push(collection);

  return collections;
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
    
    process_metadata(workbook, f.path);
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
  process_metadata(workbook, filename);
}

/**
 * Process the metadata within the xlsx workbook
 *
 * @param Object workbook The xlsx workbook object
 */
function process_metadata(workbook, path) {
  process_total = 0;
  rolling_back = false;
  process_counter = 0;

  var worksheet = workbook.Sheets[workbook.SheetNames[0]];
  metadata_array = build_metadata_array(worksheet);
  if ( metadata_array === false ) return;
  
  locationpath = path.match(/.*[/\\]/);

  process_metadata_objects();
}

/**
 * Processes the metadata array into a format that can be used in Archivematica
 *
 * @param String locationpath The location where the xlsx lives long with the files
 * @param String subdir The sub directory to place all the processed files
 * @return Array
 */
function process_metadata_objects() {
  if (settings.mint_arks) {
    logger.log('Sending objects for minting...');
  }

  metadata_array.forEach(function(collection){
    var objects = collection.getObjects();
    objects.forEach(function(object){
      if (settings.mint_arks) {
        mint_object(object);
      }
      else {
        if ( !('dcterms.identifier' in object.metadata) ) {
          object.metadata['dcterms.identifier'] = '';
        }
        process_object_files(object);
      }
    });
  });
}

/**
 * Process all the files in a object
 *
 * @param Object object The item to process
 */
function process_object_files(object) {
    if ( rolling_back ) return;
    process_counter++;

    var id = object.metadata['dcterms.identifier'];
    var id_parts = id.split('/');
    var seq = (parseInt(object.index, 10) + 1);
    object.parts += padLeft(seq.toString(), 4, "0") + ((id_parts[2] !== undefined) ? '_' + id_parts[2] : '');
    
    var part_types = ['ac', 'mm', 'pm'];
    object.files.forEach(function(file){
      part_types.forEach(function(type){
        file.setParts(object.parts);
        var part_dir = file.getPartsByType(type);
        if (part_dir) {
          var dest = locationpath + subdir + '/' + part_dir;
          object.parts_by_type[type] = part_dir;
          move_file(file.getFilename(type), dest);
        }
      });
    });

    if ( process_counter === process_total ) {
      output_am_csv_file();
    }
}

/**
 * Movies file to destination
 *
 * @param String filename The file name to be moved
 * @param String dest The destination path
 * @return Boolean True if move was successful
 */
function move_file(filename, dest) {
  mkdirp.sync(dest, function(err) {
    if (err) {
      logger.error('Failed to create object directory. "' + dirdest + '"');
      return false;
    }
  });

  var srcfilepath = locationpath + filename;

  try {
    fs.renameSync(srcfilepath, dest + '/' + filename);
    logger.log('Moved file "' + filename + '" to "' + dest + '"');
  }
  catch (err) {
    logger.error('Failed to move file "' + filename + '", ' + err.message);
    return false;
  }

  return true;
}

/**
 * Output the Archivematica CSV file from metadata_array
 */
function output_am_csv_file() {
  logger.log('Building Archivematica CSV...');
  var out = build_am_csv_array();
  var metadatadir = locationpath + subdir + '/metadata';
  mkdirp.sync(metadatadir);

  mkdirp.sync(locationpath + subdir + '/log');
  
  stringify(out, function(err, output) {
      if (err) {
        console.log('Error in csv-strigify: ' + err.message)
      }
      writer.write(output, metadatadir + '/metadata.csv');
      logger.log('Saved CSV file');
      logger.log('Done');
  });
}

/**
 * Builds a array for CSV output from the metadata_array
 *
 * @return Array
 */
function build_am_csv_array() {
  // Build the headers for the AM output
  output_am_metadata = [[
    'parts',
    'dcterms.title',
    'dcterms.creator',
    'dc.date',
    'dcterms.description',
    'dcterms.publisher',
    'dcterms.isPartOf',
    'dc.rights',
    'dcterms.accessRights',
    'dcterms.identifier'
  ]];

  var part_types = ['ac', 'mm', 'pm'];
  metadata_array.forEach(function(collection){
    output_am_metadata.push(build_am_row_array({ parts: 'objects', "dc.title": collection.title }));
    var objects = collection.getObjects();
    part_types.forEach(function(type) {
      objects.forEach(function(object){
        var parts;
        if ( (parts = object.getPartsByType(type)) ) {
          output_am_metadata.push(build_am_row_array(Object.assign(
            object.metadata,
            { parts: parts }
          )));
          object.files.forEach(function(file){
            if (file.hasMetadata()) {
              output_am_metadata.push(build_am_row_array(Object.assign(
                file["metadata"],
                { parts: file.getPartsByType(type) + '/' + file.getFilename(type) }
              )));
            }
          });
        }
      });
    });
  });

  return output_am_metadata;
}

/**
 * Builds a single row that will be used in the AM ingest CSV
 *
 * @param Object item The item containing the metadata
 * @return Array The array formated for AM
 */
function build_am_row_array(item) {
  /*
   * Header columns
   *  parts
   *  dcterms.title
   *  dcterms.creator
   *  dc.date
   *  dcterms.description
   *  dcterms.publisher
   *  dcterms.isPartOf
   *  dc.rights
   *  dcterms.accessRights
   *  dcterms.identifier
   */
  return [
    item['parts'] || '',
    item['dcterms.title'] || '',
    item['dcterms.creator'] || '',
    item['dc.date'] || '',
    item['dcterms.description'] || '',
    item['dcterms.publisher'] || '',
    item['dcterms.isPartOf'] || '',
    item['dc.rights'] || '',
    item['dcterms.accessRights'] || '',
    item['dcterms.identifier'] || ''
  ];
}

/**
 * Walks the directory and subdirectory and returns an array of files.
 *
 * @param String dir The directory to walk
 * @param Array filelist The list of files found in walk
 * @return Array
 */
function walk(dir, filelist) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = walk(dir + '/' + file, filelist);
    }
    else {
      filelist.push(dir + '/' + file);
    }
  });
  return filelist;
}

/**
 * Mints an Ark for the given object
 *
 * @param Object object The item being minted
 * @param Int counter A counter keeping track of how many times we've gone around
 * @return String The ARK identifier
 */
function mint_object(object, counter) {
  if ( counter === undefined ) {
    counter = 0;
  }

  var post_data = {
    who: object.metadata['dcterms.creator'] || 'unknown',
    what: object.metadata['dc.title'],
    when: object.metadata['dcterms.date'] || 'unknown'
  };

  if ( settings.mint_url === '' || settings.api_key === '' ) {
    logger.error('Unable to mint. Please provide the URL and/or API key for the minter.');
    return;
  }

  $.ajax({
    url: settings.mint_url,
    headers: {
      'api-key': settings.api_key
    },
    dataType: 'json',
    method: 'POST',
    data: post_data,
    success: function (data) {
      var id = data['id'];
      logger.log('Identifier "' + id + '" => "' + object.metadata['dc.title'] + '"', 'good');
      object.metadata['dcterms.identifier'] = id;
      process_object_files(object);
    },
    error: function(data) {
      logger.warn('FAILED to mint "' + object.metadata['dc.title'] + '", trying again...');
      if ( counter > 5 ) {
        logger.error('FAILED to mint "' + object.metadata['dc.title'] + "\" for the last time");
        logger.error("Unable to get ARK identifier. Something bad must have happened so I'm quitting.");
        rollback();
      }
      else {
        mint_object(object, counter + 1);
      }
    }
  });
}

$(document).ajaxStop(function(){
  if ( process_counter !== process_total ) {
    logger.warn("Finished minting but processing didn't seem to finish. This doesn't seem right");
  }
});

/**
 * Rollback what has been done. This deletes all minted identifiers during the process and moves files back.
 */
function rollback(){
  rolling_back = true;
  logger.warn('ROLLING BACK TO ORIGINAL STATE...');

  if (settings.mint_arks) {
    metadata_array.forEach(function(collection){
      var objects = collection.getObjects();
      objects.forEach(function(object){
        var ark = object.metadata['dcterms.identifier'];
        if (ark !== undefined && ark !== '' && ~ark.indexOf('ark:/')) {
          delete_identifier(ark);
        }
      });
    });
  }

  logger.warn('Moving files back to "' + locationpath + '"');
  var files = walk(locationpath + subdir + '/objects');

  files.forEach(function(file){
    var filename = file.match(/[^\/\\]+$/)[0];
    try {
      fs.renameSync(file, locationpath + filename);
      logger.log('Moved file "' + filename + '" back to "' + locationpath + '"');
    } catch (err) {
      logger.error(err.message);
    }
  });

  if ( subdir !== '' && subdir !== '/' && subdir !== "\\") {
    var ignestpath = locationpath + subdir;
    logger.log('Removing ingest directory "' + ignestpath + '"');
    rimraf(ignestpath, function(err) {
      if (err) {
        console.log('Error in removing directory in rollback(): ' + err.message)
      }
    });
  }

  logger.warn('Done');
}

/**
 * Deletes the ARK identifier from the resolver.
 *
 * @param String ark The ARK identifier to delete
 */
function delete_identifier(ark){
  if (settings.destroy_url.slice(-1) !== '/') { 
    settings.destroy_url += '/'
  }

  $.ajax({
    url: settings.destroy_url + ark,
    headers: {
      'api-key': settings.api_key
    },
    method: 'DELETE',
    success: function (data) {
      logger.log('Identifier "' + ark + '" successfully destoryed');
    }
  });
}