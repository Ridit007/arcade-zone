// =====================================================
// ARCADE ZONE — Google Apps Script Booking Backend
// =====================================================
// Deploy as Web App: Execute as "Me", Access: "Anyone"
// =====================================================

// Console inventory (max slots per time)
var INVENTORY = {
  'PlayStation 5': 2,
  'PlayStation 4': 1,
  'Driving Simulator': 2,
  'PC Gaming Station': 4
};

var timeSlots = [
  '10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM',
  '3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM',
  '8:00 PM','9:00 PM','10:00 PM'
];

// Screenshot folder name in Google Drive
var SCREENSHOT_FOLDER_NAME = 'Arcade Zone Payment Screenshots';

// ---------- CORS helper ----------
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- SCREENSHOT HELPERS ----------
function getScreenshotFolder() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('SCREENSHOT_FOLDER_ID');
  
  if (folderId) {
    try {
      var folder = DriveApp.getFolderById(folderId);
      return folder;
    } catch (e) {
      // Folder was deleted, create new one
    }
  }
  
  // Create new folder
  var folders = DriveApp.getFoldersByName(SCREENSHOT_FOLDER_NAME);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(SCREENSHOT_FOLDER_NAME);
  }
  
  // Save folder ID for reuse
  props.setProperty('SCREENSHOT_FOLDER_ID', folder.getId());
  return folder;
}

function saveScreenshot(base64Data, fileName) {
  if (!base64Data || !fileName) return '';
  
  try {
    var folder = getScreenshotFolder();
    
    // Decode base64
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', fileName);
    
    // Detect MIME type from filename
    var ext = fileName.split('.').pop().toLowerCase();
    var mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    blob.setContentType(mimeType);
    
    // Save file
    var file = folder.createFile(blob);
    
    // Set sharing to "Anyone with the link can view"
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return shareable URL
    return file.getUrl();
  } catch (err) {
    Logger.log('Screenshot save error: ' + err.message);
    return '';
  }
}

// ---------- GET handler ----------
function doGet(e) {
  var action = e.parameter.action || '';

  if (action === 'getSlots') {
    return jsonResponse(getSlots(e.parameter.date, e.parameter.console));
  }

  if (action === 'ping') {
    return jsonResponse({ ok: true, message: 'Arcade Zone API is live' });
  }

  return jsonResponse({ error: 'Unknown action' });
}

// ---------- POST handler ----------
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'book') {
      return jsonResponse(createBooking(data));
    }

    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ---------- GET SLOTS ----------
function getSlots(date, consoleName) {
  if (!date || !consoleName) {
    return { error: 'Missing date or console parameter' };
  }

  var maxSlots = INVENTORY[consoleName] || 0;
  if (maxSlots === 0) {
    return { error: 'Unknown console: ' + consoleName };
  }

  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();

  // Count bookings per time slot for this date + console
  var counts = {};
  
  // Skip header row (index 0)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowConsole = String(row[4]).trim(); // Column E: Console
    var rowDate = row[5];    // Column F: Date
    var rowTime = row[6];    // Column G: Time
    var rowDuration = row[7]; // Column H: Duration (e.g. "2 Hours")
    var rowPlayers = parseInt(row[8]) || 1; // Column I: Players
    var rowStatus = String(row[10]).trim(); // Column K: Status

    // Skip cancelled OR rejected bookings
    if (rowStatus === 'Cancelled' || rowStatus === 'Rejected') continue;

    // Format date safely
    var dateStr = '';
    if (rowDate instanceof Date) {
      dateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(rowDate).replace(/^'/, '').trim(); // Remove leading quote if exists
    }

    // Format time safely
    var timeStr = '';
    if (rowTime instanceof Date) {
      // If Google Sheets parsed it as a time object, format it back to exactly "10:00 AM"
      timeStr = Utilities.formatDate(rowTime, Session.getScriptTimeZone(), 'h:mm a');
    } else {
      timeStr = String(rowTime).replace(/^'/, '').trim();
    }

    if (dateStr === date && rowConsole === consoleName) {
      // Calculate how many hour-slots this booking takes
      var durText = String(rowDuration);
      var hours = 1;
      var parsedNum = parseFloat(durText);
      if (!isNaN(parsedNum)) {
        if (durText.toLowerCase().indexOf('min') > -1) {
          hours = parsedNum / 60; // 30 mins = 0.5
        } else {
          hours = parsedNum; // 2 hours = 2
        }
      }
      var slotsToBlock = Math.ceil(hours);
      
      // Block the start slot and subsequent slots
      var startIndex = timeSlots.indexOf(timeStr);
      if (startIndex > -1) {
        for (var s = 0; s < slotsToBlock; s++) {
          var targetSlot = timeSlots[startIndex + s];
          if (targetSlot) {
            if (!counts[targetSlot]) counts[targetSlot] = 0;
            counts[targetSlot] += rowPlayers;
          }
        }
      } else {
        // Fallback if exact match fails
        if (!counts[timeStr]) counts[timeStr] = 0;
        counts[timeStr] += rowPlayers;
      }
    }
  }

  // Build slot availability for all hours
  var slots = {};
  for (var j = 0; j < timeSlots.length; j++) {
    var time = timeSlots[j];
    var booked = counts[time] || 0;
    slots[time] = {
      booked: booked,
      total: maxSlots,
      available: booked < maxSlots
    };
  }

  return {
    success: true,
    date: date,
    console: consoleName,
    maxSlots: maxSlots,
    slots: slots
  };
}

// ---------- CREATE BOOKING ----------
function createBooking(data) {
  // Validate required fields
  if (!data.console || !data.date || !data.time || !data.name || !data.phone) {
    return { success: false, error: 'Missing required fields' };
  }

  var consoleName = data.console;
  var maxSlots = INVENTORY[consoleName] || 0;

  // Double-check availability for all requested hours
  var slotsInfo = getSlots(data.date, consoleName);
  if (slotsInfo.error) return { success: false, error: slotsInfo.error };

  // Calculate slots needed
  var durText = String(data.duration || '1 Hour');
  var hours = 1;
  var parsedNum = parseFloat(durText);
  if (!isNaN(parsedNum)) {
    if (durText.toLowerCase().indexOf('min') > -1) {
      hours = parsedNum / 60;
    } else {
      hours = parsedNum;
    }
  }
  var slotsToBlock = Math.ceil(hours);
  var requestedPlayers = parseInt(data.players) || 1;
  
  var startIndex = timeSlots.indexOf(data.time);
  if (startIndex === -1) {
    // If somehow an invalid time is sent, fallback to simple check
    var slotData = slotsInfo.slots[data.time];
    var availableFallback = slotData ? (slotData.total - slotData.booked) : 0;
    if (availableFallback < requestedPlayers) {
      return { success: false, error: 'Sorry! Not enough slots available for ' + requestedPlayers + ' player(s).' };
    }
  } else {
    // Check all slots that will be occupied
    for (var s = 0; s < slotsToBlock; s++) {
      var checkSlot = timeSlots[startIndex + s];
      if (checkSlot) {
        var sData = slotsInfo.slots[checkSlot];
        var availableSlots = sData ? (sData.total - sData.booked) : 0;
        if (availableSlots < requestedPlayers) {
          return { success: false, error: 'Sorry! Only ' + availableSlots + ' slot(s) available at ' + checkSlot + '. Cannot book for ' + requestedPlayers + ' player(s).' };
        }
      }
    }
  }

  // Generate booking ID
  var bookingId = 'AZ-' + new Date().getTime().toString(36).toUpperCase();

  // Save screenshot to Google Drive if provided
  var screenshotUrl = '';
  if (data.screenshotBase64 && data.screenshotFilename) {
    screenshotUrl = saveScreenshot(data.screenshotBase64, data.screenshotFilename);
  }

  // Append to sheet
  var sheet = getBookingsSheet();
  
  // Adding a single quote prefix forces Google Sheets to treat Dates and Times as pure strings.
  // This completely eliminates auto-formatting bugs where Sheets converts "10:00 AM" into 1899 dates.
  sheet.appendRow([
    new Date(),               // A: Timestamp
    data.name,                // B: Name
    "'" + data.phone,         // C: Phone (prevent scientific notation)
    data.email || '',         // D: Email
    consoleName,              // E: Console
    "'" + data.date,          // F: Date (Force string)
    "'" + data.time,          // G: Time (Force string)
    data.duration || '1 Hour',// H: Duration
    data.players || 1,        // I: Players
    data.notes || '',         // J: Notes
    'Confirmed',              // K: Status
    bookingId,                // L: Booking ID
    data.totalPrice || 0,     // M: Total Price
    screenshotUrl             // N: Payment Screenshot
  ]);

  return {
    success: true,
    bookingId: bookingId,
    message: 'Booking confirmed! ID: ' + bookingId
  };
}

// ---------- HELPERS ----------
function getBookingsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Bookings');

  if (!sheet) {
    // Create the sheet with headers if it doesn't exist
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow([
      'Timestamp', 'Name', 'Phone', 'Email', 'Console',
      'Date', 'Time', 'Duration', 'Players', 'Notes',
      'Status', 'Booking ID', 'Total Price', 'Payment Screenshot'
    ]);
    // Style header
    sheet.getRange('A1:N1').setFontWeight('bold').setBackground('#4a148c').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    // Set column widths
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(5, 140);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(11, 100);
    sheet.setColumnWidth(12, 130);
    sheet.setColumnWidth(14, 250); // Payment Screenshot column
  }

  return sheet;
}

// Auto-create sheet on first open
function onOpen() {
  getBookingsSheet();
  SpreadsheetApp.getUi().createMenu('Arcade Zone')
    .addItem('View Dashboard', 'showDashboard')
    .addToUi();
}

function showDashboard() {
  var sheet = getBookingsSheet();
  var data = sheet.getDataRange().getValues();
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var todayCount = 0;
  for (var i = 1; i < data.length; i++) {
    var rowDate = data[i][5];
    var formatted = '';
    if (rowDate instanceof Date) {
      formatted = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      formatted = String(rowDate).replace(/^'/, '').trim();
    }
    var rowStatus = String(data[i][10]).trim();
    
    if (formatted === today && rowStatus !== 'Cancelled') {
      todayCount++;
    }
  }

  var html = '<h2>Arcade Zone Dashboard</h2>' +
    '<p><strong>Total Bookings:</strong> ' + (data.length - 1) + '</p>' +
    '<p><strong>Today\'s Bookings:</strong> ' + todayCount + '</p>' +
    '<p><em>Tip: Change Status to "Cancelled" to free a slot.</em></p>';

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(300).setHeight(200),
    'Dashboard'
  );
}
