
/**
 * @file dp_model.js
 *
 * A collection model used in Brays to keep track of metadata
 */

/**
 * Collection
 */
module.exports = BCollection = function(title) {
  this.title = title || '';
  this.boxes = [];
}
/**
 * Add a box to the collection
 *
 * @param String title The box title
 */
BCollection.prototype.addBox = function(title) {
  this.boxes.push(new BBox(title));
}

/**
 * Pops a box from the collection
 *
 * @return Object
 */
BCollection.prototype.popBox = function() {
  return this.boxes.pop();
}

/**
 * Adds a folder to the last box in the collection
 *
 * @param String title The title for the folder
 */
BCollection.prototype.addFolder = function(title) {
  var box = this.popBox();
  box.folders.push(new BFolder(title, box.id));
  this.boxes.push(box);
}

/**
 * Adds a object to the last folder in last box in the collection
 *
 * @param Array metadata The metadata associated to the object
 */
BCollection.prototype.addObject = function(metadata) {
  var box = this.popBox();
  var folder = box.popFolder();
  var object = new BObject(metadata);
  object.parts = box.title + '/' + folder.title + '/';
  object.index = folder.objects.length;

  folder.objects.push(object);
  box.folders.push(folder);
  this.boxes.push(box);
}

/**
 * Adds a file to the last object in the last folder in the last box to the collection
 *
 * @param Array metadata The metadata associated to the file
 */
BCollection.prototype.addFile = function(metadata) {
  var box = this.popBox();
  var folder = box.popFolder();
  var object = folder.popObject();
  var file = new BFile(metadata["filename"], metadata);
  file.parts = object.parts;

  object.files.push(file);
  folder.objects.push(object);
  box.folders.push(folder);
  this.boxes.push(box);
}

/**
 * Returns all the objects in the collection
 * 
 * @return Array
 */
BCollection.prototype.getObjects = function() {
  var objects = [];
  this.boxes.forEach(function(box){
    box.folders.forEach(function(folder){
      folder.objects.forEach(function(object){
        objects.push(object);
      });
    });
  });
  return objects;
}

/**
 * Box
 */
var BBox = function(title) {
  this.title = title || '';
  this.folders = [];
}

/**
 * Pops folder from box
 *
 * @return Object
 */
BBox.prototype.popFolder = function() {
  return this.folders.pop();
}

/**
 * Folder
 */
var BFolder = function(title) {
  this.title = title || '';
  this.objects = [];
}

/**
 * Pops a object from folder
 *
 * @return Object
 */
BFolder.prototype.popObject = function() {
  return this.objects.pop();
}

/**
 * Object
 */
var BObject = function(metadata) {
  this.parts = '';
  this.parts_by_type = [];
  this.metadata = clean_metadata(metadata);
  this.index = 0;
  this.files = [];
}

/**
 * Gets the parts metadata depending on type PM/MM/AC
 *
 * @param String type The type of object PM/MM/AC
 */
BObject.prototype.getPartsByType = function(type) {
  if ( type in this.parts_by_type ) {
    return this.parts_by_type[type];
  }
  return false;
}

/**
 * File
 */
var BFile = function(filename, metadata){
  this.parts = '';
  this.filename = filename || '';
  this.ext = { 
    pm: metadata["PM"] || '', 
    mm: metadata["MM"] || '', 
    ac: metadata["AC"] || ''
  };
  this.metadata = clean_metadata(metadata);
}

/**
 * Returns the filename depending on the type passed PM/MM/AC
 *
 * @param String type The type of object file PM/MM/AC
 * @return String
 */
BFile.prototype.getFilename = function(type){
  if ( this.ext[type] ) {
    return this.filename + (type === 'ac' ? '' : '_' + type) + this.ext[type];
  }
  return false;
}

/**
 * Returns the parts string depending on the type passed PM/MM/AC
 *
 * @param String type The type of object file PM/MM/AC
 * @return String
 */
BFile.prototype.getPartsByType = function(type) {
  if ( this.ext[type] ) {
    return 'objects/' + type + '/' + this.parts
  }
  return false;
}

/**
 * Sets the parts string to the file
 *
 * @param String parts The parts string to set
 */
BFile.prototype.setParts = function(parts) {
  this.parts = parts || '';
}

/**
 * Returns true if the file has any metadata (does not include 'parts')
 *
 * @return Boolean
 */
BFile.prototype.hasMetadata = function() {
  var data = '';
  for ( var key in this.metadata ) {
    if (key !== 'parts') {
      data += this.metadata[key];
    }
  }
  return (data !== '');
}

/**
 * Cleans up the metadata hash
 *
 * @param Object metadata The metadata to clean up
 * @return Object
 */
function clean_metadata(metadata) {
  delete metadata["COLL"];
  delete metadata["BOX"];
  delete metadata["FOLDER"];
  delete metadata["OBJECT"];
  delete metadata["FILE"];
  delete metadata["filename"];
  delete metadata["PM"];
  delete metadata["MM"];
  delete metadata["AC"];

  return metadata;
}