/**
 * reader.js
 *
 * Reads in a well formated xlsx to produce a CSV for ingest into Archivematica and DAMS
 */
var xlsx = require('xlsx');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var stringify = require('csv-stringify');
var cdm = require('./assets/javascript/cdm.js');
var rolling_back = false;
var dp_model_root = null;
var locationpath = null;

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

/**
 * Process the metadata within the xlsx workbook
 *
 * @param Object workbook The xlsx workbook object
 */
function process_workbook(workbook, path) {
  var worksheet = workbook.Sheets[workbook.SheetNames[0]];
  dp_model = build_dp_model(worksheet);
  if ( dp_model === false ) return;
  
  locationpath = path.match(/.*[/\\]/);

  if (settings.mint_arks) {
    mint_sip_package(dp_model);
  }
  else {
    askForArk();
  }
}

/**
 * Displays a dialog to ask for a ARK if minting is off
 */
function askForArk() {
  $('#processark').animate({
    opacity: 1,
    top: "0px"
  });
  $('#processark').show();
}

/**
 * Processes preservation file with the ARK provided
 *
 * @see askForArk
 */
function processWithArk() {
  var ark = $('#process_ark_identifier').val();

  logger.log('Processing preservation file without minting a new ark')
  if (ark !== '') {
    logger.log('Using ark: ' + ark, 'good');
  }

  dp_model_root.metadata['dcterms.identifier'] = ark;
  process_metadata_objects(dp_model_root, ark);

  $('#processark').animate({
    opacity: 0,
    top: "-300px"
  }, 400, function(){
    $(this).hide();
    $('#process_ark_identifier').val('');
  });
}

/**
 * Turns a xlsx worksheet object into a array containing metadata objects and files.
 *
 * @param Object worksheet
 * @return Array
 */
function build_dp_model(worksheet) {
  var data = worksheet_to_array(worksheet);
  var c_object = null;
  var prev_level = null;
  var object_sequence = 0;

  $.each(data, function(index, row) {
    var level = row.hierarchy.level;

    if ( level === undefined ) {
      // Every valid row should have a level. Skipping
      return true;
    }

    if (is_file(row)) {
      var file = new cdm.cdmFile(row.file.filename, row.metadata, row.file);
      c_object.files.push(file);

      return true;
    }
    else if (is_series(row)) {
      object_sequence = 0;
      var obj = new cdm.cdmSeries(row.hierarchy[level], row.metadata);
      if (level === prev_level) {
        c_object.parent.push(obj);
      }
      else if (level > prev_level) {
        c_object.push(obj);
      }
      else {
        for (var i = prev_level; i !== level; i--) {
          c_object = c_object.parent;
        }
        c_object.push(obj);
      }

      c_object = obj;
    }
    else if (is_object(row)) {
      object_sequence++;
      var obj = new cdm.cdmObject(padLeft(object_sequence.toString(), 3, '0'), row.metadata);
      if (prev_level === level) {
        c_object.parent.push(obj);
      }
      else {
        c_object.push(obj);
      }
      c_object = obj;
    }
    else if (is_collection(row)) {
      dp_model_root = c_object = new cdm.cdmCollection(row.metadata['dcterms.title'], row.metadata);
    }

    prev_level = level;

  });

  return dp_model_root;
}

/**
 * Returns true of the object is a file
 *
 * @param Object obj The object from the spreadsheet row
 * @return Boolean
 */
function is_file(obj) {
  return obj.file.filename !== '';
}

/**
 * Returns true of the object is a series
 *
 * @param Object obj The object from the spreadsheet row
 * @return Boolean
 */
function is_series(obj) {
  var level = obj.hierarchy.level;
  return obj.hierarchy[level].toLowerCase() !== 'x' && !is_collection(obj);
}

/**
 * Returns true of the object is a digital object
 *
 * @param Object obj The object from the spreadsheet row
 * @return Boolean
 */
function is_object(obj) {
  return !is_file(obj) && !is_series(obj) && !is_collection(obj);
}

/**
 * Returns true of the object is a collection
 *
 * @param Object obj The object from the spreadsheet row
 * @return Boolean
 */
function is_collection(obj) {
  return obj.hierarchy.level === 0;
}

/**
 * Takes the ingest XSLT and turns it into a array
 *
 * @param Object worksheet The worksheet being read
 * @return Array
 */
function worksheet_to_array(worksheet) {
  var range = xlsx.utils.decode_range(worksheet['!ref']);
  var headers = [];
  var rows = [];
  for ( var c = range.s.c; c <= range.e.c; c++ ) {
    var cell = xlsx.utils.encode_cell({r: 0, c: c});
    headers[c] = worksheet[cell].v;
  }

  for ( var r = 1; r <= range.e.r; r++ ) {
    var row = {};

    // hierarchy information
    row.hierarchy = [];
    for (var c = 0; c <= 5; c++) {
      var cell = xlsx.utils.encode_cell({r: r, c: c});
      var h = worksheet[cell] !== undefined ? worksheet[cell].v : '';

      if (h !== '') {
        row.hierarchy.level = c;
      }

      row.hierarchy.push(h); 
    }

    // file information
    row.file = {};
    for (var c = 6; c <= 9; c++) {
      var cell = xlsx.utils.encode_cell({r: r, c: c});
      var f = worksheet[cell] !== undefined ? worksheet[cell].v : '';

      row.file[headers[c]] = f;
    }

    // metadata information
    row.metadata = {};
    for (var c = 10; c <= range.e.c; c++ ) {
      var cell = xlsx.utils.encode_cell({r: r, c: c});
      var m = worksheet[cell] !== undefined ? worksheet[cell].v : '';

      row.metadata[headers[c]] = m;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Processes the metadata array into a format that can be used in Archivematica
 *
 * @param Object dp_model The digital preservation model from speadsheet
 * @param String ark The ark identifier of the SIP injest
 */
function process_metadata_objects(dp_model, ark) {
  logger.log('Creating ingest packages...');

  var objects = get_objects(dp_model);
  $.each(objects, function(index, object){
    object.order = padLeft((index + 1).toString(), 3, '0')
    process_object_files(object, ark);
  });
  
  output_csv_files();
}

/**
 * Returns all the digital objects in the dp_model
 *
 * @param Object obj The root dp model object
 * @return Array
 */ 
function get_objects(obj) {
  var objects = [];
  if (obj.hasMembers()){
    $.each(obj.members, function(index, value){
      if (value.constructor.name == 'cdmObject') {
        objects.push(value);
        return true;
      }
      if (value.hasMembers()) {
        objects = objects.concat(get_objects(value));
      }
    });
  }

  return objects;
}

/**
 * Process all the files in a object
 *
 * @param Object object The item to process
 * @param String ark The ARK minted
 */
function process_object_files(object, ark) {
  var id_parts = ark.split('/');
  object.parts = get_parts_path(object) + object.label + ((id_parts[2] !== undefined) ? '_' + id_parts[2] : '');

  $.each(object.files, function(index, file){
    /* Handle Preservation Masters and Modified Masters */
    $.each(['pm', 'mm'], function(index, type){
      if (file.hasType(type)) {
        var dest = locationpath + 'sip/objects/' + type + '/' + object.parts;
        move_file(file.getFilenameByType(type), dest);
      }
    });

    /* Handle Access Copies */
    if (file.hasType('ac')) {
      var dest = locationpath + 'dip/objects/' + object.order;
      move_file(file.getFilenameByType('ac'), dest);
    }
  });
}

/**
 * Moves file to destination
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
 * Returns the 'parts' column for the SIP ingest csv
 *
 * @param Object object The digital object
 * @return String
 */
function get_parts_path(object) {
  var parts = '';
  if (object.constructor.name === 'cdmSeries') {
    parts = object.label + '/';
  }
  if (object.parent !== undefined) {
    return get_parts_path(object.parent) + parts;
  }
  return '';
}

/**
 * Output the Archivematica CSV file from metadata_array
 */
function output_csv_files() {
  logger.log('Building Archivematica SIP CSV...');
  var out = build_am_csv_array();
  var metadatadir = locationpath + 'sip/metadata';
  mkdirp.sync(metadatadir);

  mkdirp.sync(locationpath + 'sip/logs');
  
  stringify(out, function(err, output) {
      if (err) {
        console.log('Error in csv-strigify: ' + err.message)
      }
      writer.write(output, metadatadir + '/metadata.csv');
      logger.log('Saved SIP CSV file');
      logger.log('Done');
  });


  logger.log('Building Access DIP CSV...');
  var out = build_dip_csv_array();
  mkdirp.sync(locationpath + 'dip');
  stringify(out, function(err, output) {
      if (err) {
        console.log('Error in csv-strigify: ' + err.message)
      }
      writer.write(output, locationpath + 'dip/metadata.csv');
      logger.log('Saved DIP CSV file');
      logger.log('Done');
  });

  var submissionDocumentation = metadatadir + '/submissionDocumentation';
  mkdirp.sync(submissionDocumentation);
  writer.write(logger.toString(), submissionDocumentation + 
    '/carpenters-' + formatTodaysDate() + '.log'
  );

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

  var coll_row = Object.assign(dp_model_root.metadata, { parts: 'objects' });
  output_am_metadata.push(build_am_row_array(coll_row));

  var objects = get_objects(dp_model_root);

  var part_types = ['mm', 'pm'];
  $.each(part_types, function(index, type){
    $.each(objects, function(index, object){
      var pre_parts = 'objects/' + type + '/';
      if (object.hasFilesWithPartsType(type)) {
        output_am_metadata.push(build_am_row_array(Object.assign(object.metadata, { parts: pre_parts + object.parts })));
        $.each(object.files, function(index, file){
          if (file.hasType(type)) {
            output_am_metadata.push(build_am_row_array(Object.assign(file.metadata, 
              { parts: pre_parts + object.parts + '/' + file.getFilenameByType(type) }
            )));
          }
        });
      }
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
 * Builds a array for Access CSV output
 *
 * @return Array
 */
function build_dip_csv_array() {
  var dip_array = [];
  var metadata_fields = Object.keys(dp_model_root.metadata);
  var index = metadata_fields.indexOf('parts');
  if (index > -1) {
    metadata_fields.splice(index, 1);
  }

  dip_array.push(['file_path'].concat(metadata_fields));
  dip_array.push(['objects'].concat(get_metadata_from_fields(dp_model_root.metadata, metadata_fields)));
  var objects = get_objects(dp_model_root);
  $.each(objects, function(index, object){
    if ( object.hasFilesWithPartsType('ac') ) {
      var metadata = get_metadata_from_fields(object.metadata, metadata_fields);
      dip_array.push(['objects/' + object.order].concat(metadata));
      $.each(object.files, function(index, file){
        if (file.hasType('ac')) {
          dip_array.push(['objects/' + object.order + '/' + file.getFilenameByType('ac')].concat(get_metadata_from_fields(file.metadata, metadata_fields)));
        }
      });
    }
  });

  return dip_array;

}

/**
 * Returns the all the metadata found in the field list
 *
 * @param Object metadata The metadata of a object (metadata fields are in keys)
 * @param Array fields The fields to return
 * @return Array
 */
function get_metadata_from_fields(metadata, fields) {
  var r = [];
  $.each(fields, function(index, field){
    if (field in metadata) {
      r.push(metadata[field]);
    }
    else {
      r.push('');
    }
  });
  return r;
}

/**
 * Walks the directory and subdirectory and returns an array of files.
 *
 * @param String dir The directory to walk
 * @param Array filelist The list of files found in walk
 * @return Array
 */
function walk(dir, filelist) {
  try {
    var files = fs.readdirSync(dir);
  }
  catch(err) {
    logger.error('Unable to read directory ' + dir);
    return [];
  }

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
 * Mints an Ark for the given SIP ingest package
 *
 * @param Object dp_model The digital preservation model being minted
 */
function mint_sip_package(dp_model) {
  logger.info('Minting SIP package...');
  var post_data = {
    who: settings.erc_who || 'unknown',
    what: dp_model.title,
    when: formatTodaysDate()
  };

  if ( settings.mint_url === '' || settings.api_key === '' ) {
    logger.error('Unable to mint. Please provide the URL and/or API key for the minter.');
    return false;
  }

  return $.ajax({
    url: settings.mint_url,
    headers: {
      'api-key': settings.api_key
    },
    dataType: 'json',
    method: 'POST',
    data: post_data,
    success: function (data) {
      var id = data['id'];
      logger.log('Identifier "' + id + '" => "' + dp_model.title + '"', 'good');
      dp_model.metadata['dcterms.identifier'] = id;
      update_erc_where(id);
      process_metadata_objects(dp_model, id);
    },
    error: function(data) {
      logger.warn('FAILED to mint "' + object.metadata['dcterms.title'] + '"');
    }
  });
}

/**
 * Updates the ARK erc.where after the ARK is minted
 *
 * @param String ark The ark identifier
 */
function update_erc_where(ark) {
  if (settings.erc_where === '') return;
  var where = settings.erc_where.replace('$ark$', encodeURIComponent(ark));

  if (settings.update_url.slice(-1) !== '/') { 
    settings.update_url += '/'
  }

  var post_data = {
    where: where
  };

  $.ajax({
    url: settings.update_url + ark,
    headers: {
      'api-key': settings.api_key
    },
    data: post_data,
    method: 'PUT',
    success: function (data) {
      logger.log('Identifier "' + ark + '" successfully updated erc.where');
    },
    error: function(data) {
      logger.error('FAILED to update erc.where for identifier "' + ark + '"');
    }
  });
}

/**
 * Rollback what has been done. This deletes all minted identifiers during the process and moves files back.
 */
function rollback(){
  rolling_back = true;
  logger.warn('ROLLING BACK TO ORIGINAL STATE...');

  if (!locationpath) {
    logger.error('Unable to roll back. You must process a preservation file first.');
    return;
  }

  /*
  if (ark !== undefined && ark !== '' && ~ark.indexOf('ark:/')) {
    delete_identifier(ark);
  }
  */

  rollbackFiles(locationpath, 'sip');
  rollbackFiles(locationpath, 'dip');

  var ark = dp_model_root.metadata['dcterms.identifier'];
  if (ark !== '') {
    logger.warn('Rolled back: ' + ark);
  }

  logger.warn('Done');
}

/**
 * Movies files back to original location
 *
 * @param String root_dir The root location
 * @param String dir The directory to moves files out of
 */
function rollbackFiles(root_dir, dir) {
  logger.warn('Moving files back to "' + root_dir + '"');
  var files = walk(locationpath + dir + '/objects');
  files.forEach(function(file){
    var filename = file.match(/[^\/\\]+$/)[0];
    try {
      fs.renameSync(file, root_dir + filename);
      logger.log('Moved file "' + filename + '" back to "' + root_dir + '"');
    } catch (err) {
      logger.error(err.message);
    }
  });

  logger.log('Removing ' + dir + ' directory');
  rimraf(root_dir + dir, function(err) {
    if (err) {
      console.log('Error in removing directory in rollback(): ' + err.message)
    }
  });  
}

/**
 * Deletes the ARK identifier from the resolver.
 *
 * @param String ark The ARK identifier to delete
 */
function delete_identifier(ark){
  if (settings.update_url.slice(-1) !== '/') { 
    settings.update_url += '/'
  }

  $.ajax({
    url: settings.update_url + ark,
    headers: {
      'api-key': settings.api_key
    },
    method: 'DELETE',
    success: function (data) {
      logger.log('Identifier "' + ark + '" successfully destoryed');
    }
  });
}

/**
 * Formats todays date into YYYY-MM-DD
 *
 * @return String
 */
function formatTodaysDate() {
  var d = new Date();
  var month = d.getMonth() + 1;
  var day = d.getDate();
  var year = d.getFullYear();

  month = (month < 10) ? '0' + month : month;
  day = (day < 10) ? '0' + day : day;

  return year + '-' + month + '-' + day; 
}