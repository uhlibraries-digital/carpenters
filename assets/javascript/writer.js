/**
 * writer.js
 *
 * Functions used to take in a array and output a CSV file
 */
var writer = {
  /**
   * Opens a save dialog to save the CSV data
   *
   * @param String data The CSV data to save
   */
  save: function(data) {
    dialog.showSaveDialog({ 
      filters: [
        { name: 'CSV', extensions: ['csv'] }
      ]
    },function(filename){
      if (filename === undefined) return;

      this.write(data, filename);
    });
  },
  /**
   * Writes CSV data string to a file
   *
   * @param String data The CSV string
   * @param String filename The full path and filename to write to
   */
  write: function(data, filename) {
    fs.writeFile(filename, data, function(err) {
      if (err !== undefined && err !== null) {
        logger.log('File save error: ' + err.message);
        dialog.showErrorBox("File Save Error", err.message);
      }
    });
  }
};