//// VARIABLES ////
const CALENDAR_NAME = 'Hai Climbing Calendar'
const DRY_RUN = false
const LOGGED_TYPES = [
  'INFO',
  //'REGEX',
  //'DATE',
  'CALENDAR',
  //'EMAIL',
  //'EVENT_DETAILS',
];

//// Utility functions ////

function toStr(obj) {
  return JSON.stringify(obj);
}

function log(msg, logType = 'INFO') {
  if (LOGGED_TYPES.includes(logType)) {
    Logger.log(msg);
  }
}

function safeExecute(func, ...args) {
  if (DRY_RUN) {
    log(func.name);
    log(toStr(args));
  } else {
    func(args);
  }
}

///////////////////////////

const ClimbingReservation = {
  label: "RGPro Booking",
  cancelledPrefix: "Booking Cancelled",
  bookingPrefix: "Booking Confirmed",
}

const CalendarConfig = {
  calendar: CalendarApp.getCalendarsByName(CALENDAR_NAME)[0],
}

const DATE_FORMAT = /(\w+) (\d{1,2}), (\d{1,2}:*\d{0,2}) (\w{2}) to (\d{1,2}:*\d{0,2}) (\w{2})/;
const EVENT_FORMAT = /Event\W+(.+)\W*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/;
const PARTICIPANTS = /Participants\W+(.*)\W*(== Additional Details)/;
const MAX_BOOKING_RANGE = 2 * 7 * 24 * 60 * 60 * 1000;

function isDST(d) {
    let jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
    let jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) != d.getTimezoneOffset(); 
}

function getCurrentYear(d) {
  return (new Date()).getFullYear();
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
  log(toStr({groups}), 'REGEX');
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
  
  if (amPm === 'PM' && hour !== "12") {
    hour = (parseInt(hour) + 12).toString();
  }
  
  const formattedDateUTC = `${month} ${day} ${hour}:${minute} ${year} UTC`;
  const formattedDateLocal = `${month} ${day} ${hour}:${minute} ${year} ${getTimezone(new Date(formattedDateUTC))}`;
  log(toStr({formattedDateLocal}), 'DATE');
  const date = new Date(formattedDateLocal);
  return date;
}

function parseDate(message, year) {
  const groups = message.match(DATE_FORMAT);
  log(toStr({groups}), 'REGEX');
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
  const events = CalendarConfig.calendar.getEvents(startDate, endDate);
  const res = events.find((event) => { return event.getTitle().includes(eventName) });
  return res;
}

function getDescription(message) {
  const groups = message.match(PARTICIPANTS);
  log(toStr({groups}), 'REGEX');
  const participants = groups[1];
  return `Participants: ${participants}`;
}

function createEvent(startDate, endDate, eventName, description) {
  log(`Creating event ${toStr({eventName, startDate, endDate})}`);
  safeExecute(CalendarConfig.calendar.createEvent, eventName, startDate, endDate, { description });
}

function syncCalendar(config) {
  log(toStr(CalendarApp.getAllCalendars().map(cal => cal.getName())), 'CALENDAR');
  try {
    var label = GmailApp.getUserLabelByName(config.label);
    // Oldest first
    var threads = label.getThreads().reverse();
    
    for (var i = 0; i < threads.length; i++) {
      const subject = threads[i].getFirstMessageSubject();
      log(toStr({subject}), 'EMAIL');
      if (!subject.startsWith(config.bookingPrefix) && !subject.startsWith(config.cancelledPrefix)){
        continue;
      }

      const message = threads[i].getMessages()[0].getPlainBody().replace(/(\r\n|\n|\r)/gm, " ");
      const year = threads[i].getMessages()[0].getDate().getFullYear();
      log(toStr({message}), 'EMAIL');
      const reservationSummary = subject.substr(subject.indexOf(':') + 2);
      const eventType = getEventType(message);
      const eventName = `${eventType} - ${reservationSummary}`;
      const existingEvent = getExistingFutureEvent(eventName);
      log(toStr({subject, eventType, eventName, existingEvent}), 'EVENT_DETAILS');
      if (subject.startsWith(config.bookingPrefix) && !existingEvent) {
        const dates = parseDate(message, year);
        const startDate = dates[0];
        const endDate = dates[1];
        const isFutureEvent = startDate > new Date();
        log(toStr({startDate, endDate}), 'DATE');
        if (isFutureEvent) {
          const description = getDescription(message);
          log(`Creating event ${toStr({eventName})}`);
          createEvent(startDate, endDate, eventName, description);
        }
      }
      if (subject.startsWith(config.cancelledPrefix) && existingEvent) {
        log(`Deleting event ${toStr({eventName})}`);
        safeExecute(existingEvent.deleteEvent);
      }
    }  
  } catch (error) {
    log(error);
  }
}

function doWork() {
  syncCalendar(ClimbingReservation);
}


