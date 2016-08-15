/**
 * manual_mint.js
 *
 * Provices function to create and edit ARKs manually
 */
const {clipboard} = require('electron').remote;


/**
 * Displays the minter display to input ERC to mint a ark
 */
function displayMinter() {
  $('#minter .display').show();

  $('#minter_erc_who').val(settings.erc_who);
  $('#minter_erc_what').val('');
  $('#minter_erc_when').val(formatTodaysDate());
  $('#minter_erc_where').val(settings.erc_where);

  $('#minter').animate({
    opacity: 1,
    top: "0px"
  });
  $('#minter').show();
}

/**
 * Closes the minter display
 */
function closeMinter() {
  $('#minter').animate({
    opacity: 0,
    top: "-300px"
  }, 400, function(){
    $(this).hide();
    $('#minter .loading').hide();
    $('#minter .response').hide();
  });
}

/**
 * Mints a ARK
 */
function mintArk() {
  $('#minter .display').hide();
  $('#minter .loading').show();

  var update_where = false;
  var post_data = {
    who: $('#minter_erc_who').val() || 'unknown',
    what: $('#minter_erc_what').val(),
    when: $('#minter_erc_when').val()
  };

  var update_where = $('#minter_erc_where').val().indexOf('$ark$') > -1;
  if (!update_where) {
    post_data.where = $('#minter_erc_where').val();
  }

  if ( settings.mint_url === '' || settings.api_key === '' ) {
    logger.error('Unable to mint. Please provide the URL and/or API key for the minter.');
    closeMinter();
    return false;
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
      if (update_where) {
        minter_update_erc_where(data);
      }
      else {
        minter_get_ark(data['id']);
      }
    },
    error: function(data) {
      logger.warn('FAILED to mint');
      closeMinter();
    }
  });
}

/**
 * Updates the ARK with new ERC.where.
 * This is used when the ERC.where has the ARK identifier in it.
 *
 * @param Object ark The returned object containing ARK information
 */
function minter_update_erc_where(ark) {
  var post_data = {
    where: $('#minter_erc_where').val().replace('$ark$', encodeURIComponent(ark['id']))
  };

  $.ajax({
    url: settings.update_url + ark['id'],
    headers: {
      'api-key': settings.api_key
    },
    data: post_data,
    method: 'PUT',
    success: function (data) {
      showMinterComplete(data);
    },
    error: function(data) {
      logger.error('FAILED to update erc.where for identifier "' + ark ['id'] + '"');
      closeMinter();
    }
  });
}

/**
 * Gets ARK ERC information for the given identifier
 *
 * @param String id The ark identifier
 */
function minter_get_ark(id) {
  $.get(settings.update_url + id).done(function(data){
    showMinterComplete(data);
  }).fail(function(){
    logger.error('FAILED to get ark information for identifier "' + id + '"');
  });
}

/**
 * Displays the ARK information after minting
 *
 * @param Object data The ark information
 */
function showMinterComplete(data) {
  var ark = data.ark;
  logger.log('Identifier created: ' + ark.id , 'good');
  logger.log('erc:');
  logger.log('who: ' + ark.who);
  logger.log('what: ' + ark.what);
  logger.log('when: ' + ark.when);
  logger.log('where: ' + ark.where);

  $('#minter .response #ark_identifier').val(ark.id);
  $('#minter .response .erc .who').text(ark.who);
  $('#minter .response .erc .what').text(ark.what);
  $('#minter .response .erc .when').text(ark.when);
  $('#minter .response .erc .where').text(ark.where);

  $('#minter .loading').hide();
  $('#minter .response').show();
}

/**
 * Copies the ARK identifier to the clipboard
 *
 * @param String selector The DOM selector holding the value to add
 */
function minterCopyToClipboard(selector) {
  clipboard.write({text: $(selector).val()})
}

/**
 * Displays the ARK input to edit
 */
function editArk() {
  $('#edit_ark_identifier').val('');
  $('#editor .getter').show();
   $('#editor').animate({
    opacity: 1,
    top: "0px"
  });
  $('#editor').show();
}

/**
 * Closes the ARK editor
 */
function closeArkEditor() {
  $('#editor').animate({
    opacity: 0,
    top: "-300px"
  }, 400, function(){
    $(this).hide();
    $('#editor .loading').hide();
    $('#editor .saving').hide();
    $('#editor .edit').hide();
  });
}

/**
 * Gets ARK infomration
 */
function getArk() {
  var ark = $('#edit_ark_identifier').val();

  if (ark === '' || !~ark.indexOf('ark:/')) {
    logger.error('Invalid ARK');
    closeArkEditor();
    return;
  }

  $('#editor .getter').hide();
  $('#editor .loading').show();
  $.get(settings.update_url + ark).done(function(data){
    arkEditor(data.ark);
  }).fail(function(){
    logger.error('FAILED to get ark information ' + ark );
    closeArkEditor();
  });
}

/**
 * Displays the ARK information for editing
 *
 * @param Object ark The ark object to edit
 */
function arkEditor(ark) {
  $('#editor .edit #editor_ark').val(ark.id);
  $('#editor .edit #editor_erc_who').val(ark.who);
  $('#editor .edit #editor_erc_what').val(ark.what);
  $('#editor .edit #editor_erc_when').val(ark.when);
  $('#editor .edit #editor_erc_where').val(ark.where);

  $('#editor .loading').hide();
  $('#editor .edit').show();
}

/**
 * Saves changed ERC information to an ARK
 */
function saveArk() {
  var id = $('#editor_ark').val();

  var post_data = {
    who: $('#editor_erc_who').val(),
    what: $('#editor_erc_what').val(),
    when: $('#editor_erc_when').val(),
    where: $('#editor_erc_where').val()
  };

  $('#editor .edit').hide();
  $('#editor .saving').show();
  $.ajax({
    url: settings.update_url + id,
    headers: {
      'api-key': settings.api_key
    },
    data: post_data,
    method: 'PUT',
    success: function (data) {
      var ark = data.ark;
      logger.log('Saved ' + ark.id, 'good');
      logger.log('erc');
      logger.log('who: ' + ark.who);
      logger.log('what: ' + ark.what);
      logger.log('when: ' + ark.when);
      logger.log('where: ' + ark.where);
      closeArkEditor();
    },
    error: function(data) {
      logger.error('FAILED to update erc for ark identifier ' + id);
      closeArkEditor();
    }
  });
}
