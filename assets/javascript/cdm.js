
/**
 * @file cdm.js
 *
 * A digital preservation model used to keep track of metadata for ingest
 */

/**
 * A collection object
 *
 * @param String title The collection title
 * @param Object metadata The collection's metadata
 */
cdmCollection = function(title, metadata, label) {
  this.title = title || '';
  this.label = label || 'unknown';
  this.metadata = metadata || '';
  this.members = [];
};

/**
 * Returns true of collection has members
 */
cdmCollection.prototype.hasMembers = function() {
  return (this.members.length > 0);
};

/**
 * Returns array of members
 * @return Array
 */
cdmCollection.prototype.hasMember = function() {
  return this.members;
};

/**
 * Adds a object to the collection
 *
 * @param Object obj The object to add
 */
cdmCollection.prototype.push = function(obj) {
  obj.parent = this;
  this.members.push(obj);
};

/**
 * Pops a object member from the collection
 *
 * @return Object
 */
cdmCollection.prototype.pop = function() {
  return this.members.pop();
};

module.exports.cdmCollection = cdmCollection;

/**
 * A Series within a collection
 *
 * @param String label The label for the series
 * @param Object metadata The metadata of the series
 */
cdmSeries = function(label, metadata) {
  this.parent = null;
  this.label = label || '';
  this.metadata = metadata || {};
  this.members = [];
};

/**
 * Returns true of series has members
 */
cdmSeries.prototype.hasMembers = function() {
  return (this.members.length > 0);
};

/**
 * Adds a object to the series
 *
 * @param Object obj The object to add
 */
cdmSeries.prototype.push = function(obj) {
  obj.parent = this;
  this.members.push(obj);
};

/**
 * Pops a object member from the series
 *
 * @return Object
 */
cdmSeries.prototype.pop = function() {
  return this.members.pop();
};

module.exports.cdmSeries = cdmSeries;

/**
 * A Object within a collection or series
 *
 * @param String label The label for the object
 * @param Object metadata The metadata of the object
 */
cdmObject = function(label, metadata) {
  this.parent = null;
  this.label = label || '';
  this.metadata = metadata || {};
  this.members = [];
  this.files = [];
};

/**
 * Returns true if object has members
 */
cdmObject.prototype.hasMembers = function() {
  return (this.members.length > 0);
};

/**
 * Adds a object to the object
 *
 * @param Object obj The object to add
 */
cdmObject.prototype.push = function(obj) {
  obj.parent = this;
  this.members.push(obj);
};

/**
 * Pops a object member from the object
 *
 * @return Object
 */
cdmObject.prototype.pop = function() {
  return this.members.pop();
};

/**
 * Returns true of the object has files
 * @return Boolean
 */
cdmObject.prototype.hasFiles = function() {
  return (this.files.length > 0);
};

/**
 * Returns true of the object contains files of a given type
 * @return Boolean
 */
cdmObject.prototype.hasFilesWithPartsType = function(type) {
  if (!this.hasFiles()) return false;
  for( var i = 0; i < this.files.length; i++ ){
    if (this.files[i].hasType(type)) {
      return true;
    }
  }
  return false;
}

module.exports.cdmObject = cdmObject;

/**
 * A file object
 *
 * @param String filename The filename
 * @param Object metadata The metadata for the file
 * @param Object ext The types information of the file
 */
cdmFile = function(filename, metadata, ext) {
  this.parent = null;
  this.filename = filename || '';
  this.metadata = metadata || {};

  this.ext = {};
  var keys = Object.keys(ext);
  for( var i = 0; i < keys.length; i++ ){
    var key = keys[i];
    this.ext[keys[i].toLowerCase()] = ext[key];
  }

};

/**
 * Returns the filename with a given type
 *
 * @param String type The type of the file: PM, MM, AC
 * @return String
 */
cdmFile.prototype.getFilenameByType = function(type) {
  if ( this.ext[type] ) {
    return this.filename + (type === 'ac' ? '' : '_' + type) + this.ext[type];
  }
  return false;
}

/**
 * Returns true if the file has a given type
 *
 * @param String type The type of the file: PM, MM, AC
 * @return Boolean
 */
cdmFile.prototype.hasType = function(type) {
  return (type in this.ext && this.ext[type] !== '');
}

module.exports.cdmFile = cdmFile;
