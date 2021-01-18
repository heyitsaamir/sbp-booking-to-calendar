const ClimbingReservation = {
  label: "RGPro Booking",
  cancelledPrefix: "Booking Cancelled",
  bookingPrefix: "Booking Confirmed",
}

//const calendarName = 'Duy Hai Bui';
//const MainCalendar = CalendarApp.getCalendarByName(calendarName)[0];
const MainCalendar = CalendarApp.getDefaultCalendar();

const DATE_FORMAT = /(\w+) (\d{1,2}), (\d{1,2}:*\d{0,2}) (\w{2}) to (\d{1,2}:*\d{0,2}) (\w{2})/;
const EVENT_FORMAT = /Event\W+(.+)\W*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/;
const MAX_BOOKING_RANGE = 2 * 7 * 24 * 60 * 60 * 1000;

function isDST(d) {
    let jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
    let jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) != d.getTimezoneOffset(); 
}

function getTimezone(date) {
  if (isDST(date)) {
    return 'PDT';
  } else {
    return 'PST';
  }
}

function getEventType(message) {  
  // GScript regex sux
  const groups = message.match(EVENT_FORMAT);
  // Logger.log(JSON.stringify({groups}));
  return groups[1].trim();
}

function timeStrToDate(year, month, day, time, amPm) {
  let hour;
  let minute;
  if (time.indexOf(":") >= 0) {
    const colonIndex = time.indexOf(":");
    minute = time.substr(colonIndex + 1);
    hour = time.substr(0, colonIndex);
  } else {
    hour = time;
    minute = "00";
  }
  
  if (amPm === 'PM') {
    hour = (parseInt(hour) + 12).toString();
  }
  
  const formattedDateUTC = `${month} ${day} ${hour}:${minute} ${year} UTC`;
  const formattedDateLocal = `${month} ${day} ${hour}:${minute} ${year} ${getTimezone(new Date(formattedDateUTC))}`;
  // Logger.log(JSON.stringify({formattedDateLocal}));
  const date = new Date(formattedDateLocal);
  return date;
}

function parseDate(message, year) {
  const groups = message.match(DATE_FORMAT);
  // Logger.log(JSON.stringify({groups}));
  const month = groups[1];
  const day = groups[2];
  const startTime = groups[3];
  const startAmPm = groups[4];
  const endTime = groups[5];
  const endAmPm = groups[6];
  return [timeStrToDate(year, month, day, startTime, startAmPm), timeStrToDate(year, month, day, endTime, endAmPm)];
}

function getExistingFutureEvent(eventName) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + MAX_BOOKING_RANGE);
  const events = MainCalendar.getEvents(startDate, endDate);
  const res = events.find((event) => { return event.getTitle().includes(eventName) });
  return res;
}

function createEvent(startDate, endDate, eventName) {
  Logger.log(`Creating event ${JSON.stringify({eventName, startDate, endDate})}` );
  MainCalendar.createEvent(eventName, startDate, endDate)
}

function includesStr(text, searchStr) {
  return text.startsWith(searchStr);
}

function syncCalendar(config) {
  try {
    var label = GmailApp.getUserLabelByName(config.label);
    // Oldest first
    var threads = label.getThreads().reverse();
    
    for (var i = 0; i < threads.length; i++) {
      const subject = threads[i].getFirstMessageSubject();
      // Logger.log(JSON.stringify({subject}));
      if (!subject.startsWith(config.bookingPrefix) && !subject.startsWith(config.cancelledPrefix)){
        continue;
      }

      const message = threads[i].getMessages()[0].getPlainBody().replace(/(\r\n|\n|\r)/gm, " ");
      const year = threads[i].getMessages()[0].getDate().getFullYear();
      // Logger.log(JSON.stringify({message}));
      const reservationSummary = subject.substr(subject.indexOf(':') + 2);
      const eventType = getEventType(message);
      const eventName = `${eventType} - ${reservationSummary}`;
      const existingEvent = getExistingFutureEvent(eventName);
      Logger.log(JSON.stringify({subject, eventType, eventName, existingEvent}));
      if (subject.startsWith(config.bookingPrefix) && !existingEvent) {
        const dates = parseDate(message, year);
        const startDate = dates[0];
        const endDate = dates[1];
        const isFutureEvent = startDate > new Date();
        // Logger.log(JSON.stringify({startDate, endDate}));
        if (isFutureEvent) {
          createEvent(startDate, endDate, eventName);
        }
      }
      if (subject.startsWith(config.cancelledPrefix) && existingEvent) {
        Logger.log(`Deleting event ${JSON.stringify({eventName})}` );
        existingEvent.deleteEvent();
      }
    }    
  } catch (error) {
    Logger.log(error);
  }
}

function doWork() {
  syncCalendar(ClimbingReservation);
}

