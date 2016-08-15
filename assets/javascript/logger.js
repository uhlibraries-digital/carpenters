/**
 * logger.js
 *
 * Displays log messages to the applications logger display
 */
var logger = {
  /**
   * Display given message to logger display
   *
   * @param String message The message to display
   */
  log: function(message, status) {
    if (status === undefined) status = 'info';

    $('.logger-display-list').append('<li data-timestamp="' + this.timestamp() + '" class="' + status + '">' + message + '</li>');
    $('#logger-display').animate({
      scrollTop: $('.logger-display-list').height()
    }, 0);
  },
  info: function(message) {
    this.log(message, 'info');
  },
  warn: function(message) {
    this.log(message, 'warn');
  },
  error: function(message) {
    this.log(message, 'error');
  },
  /**
   * Clears the logger display
   */
  clear: function() {
    $('.logger-display-list li').remove();
  },
  /**
   * Returns a timestamp
   *
   * @return String
   */
  timestamp: function() {
    var date = new Date();
    var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    var minutes = ((date.getMinutes() < 10) ? '0' : '') + date.getMinutes();
    var seconds = ((date.getSeconds() < 10) ? '0' : '') + date.getSeconds();

    return (
      date.getDate() + '/' + 
      month[date.getMonth()] + '/' + 
      date.getFullYear() + ':' + 
      date.getHours() + ':' + 
      minutes + ':' + 
      seconds
    );
  },
  save: function() {
    dialog.showSaveDialog({ filters: [
      { name: 'text', extensions: ['txt'] }
    ]},
    function (filename){
      if (filename === undefined) return;

      fs.writeFile(filename, this.toString(), function(err){
        if (err) {
          dialog.showErrorBox("Failed to save log file", err.message);
        }
      });
    });
  },
  toString: function() {
    var output = "";
    $('.logger-display-list li').each(function(){
      output += '[' + $(this).data('timestamp') + '] ' + $(this).text() + "\n";
    });
    return output;
  }
};