/**
 * @file map.js
 *
 * Defines the BCDAMS-MAP
 */

module.exports = new function() {
  this.fields = [];

  this.load = function(url) {
    if (!url) {
      console.log('MAP url not provided.');
      return null;
    }
    return $.get(url, (data) => {
      this.fields = data;
    });
  };

  this.get_field_by_full_name = function(fullname) {
    return this.fields.find(field => fullname === (field.namespace + '.' + field.name));
  };

  this.get_full_names = function(includeHidden) {
    return this.fields.filter((field) => {
      return (includeHidden) ? true : !field.hidden
    })
    .map((field) => { return (field.namespace + '.' + field.name); });
  }
}
