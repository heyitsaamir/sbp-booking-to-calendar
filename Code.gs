const ClimbingReservation = {
  label: "SBP Booking",
  cancellationLabel: "SBP Cancellation",
  prefix: "Booking Confirmed: Seattle Bouldering Project - ",
  timeInHours: 2,
  eventName: 'Climbing Reservation',
}

const FitnessReservation = {
  label: "SBP Fitness",
  cancellationLabel: "SBP Fitness Cancellation",
  prefix: "Booking Confirmed: Seattle Bouldering Project - ",
  timeInHours: 1.5,
  eventName: 'Fitness Reservation',
}

const calendarName = 'AamBush';

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

const MainCalendar = CalendarApp.getCalendarsByName(calendarName)[0];

function parseDate(message, subjectPrefix) {
  const dateString = message.substr(subjectPrefix.length);
  const groups = dateString.match(/(\w+) (\d{1,2}), (\d{1,2}:*\d{0,2}) (\w{2})/);
  // Logger.log(groups);
  const month = groups[1];
  const day = groups[2];
  const time = groups[3];
  const amPm = groups[4];
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
  
  const formattedDateUTC = `${month} ${day} ${hour}:${minute} 2020 UTC`;
  const formattedDateLocal = `${month} ${day} ${hour}:${minute} 2020 ${getTimezone(new Date(formattedDateUTC))}`;
  const date = new Date(formattedDateLocal);
  // Logger.log(date, formattedDate, dateString);
  return date;
}

function getEndTime(date, timeInHours) {
  return new Date(date.getTime() + (timeInHours * 60 * 60 * 1000));
}

function getExistingEvent(date, timeInHours, eventName) {
  const endTime = getEndTime(date, timeInHours);
  const events = MainCalendar.getEvents(date, endTime);
  const res =  events.find((event) => { return event.getTitle() === eventName });
  return res;
}

function createEvent(date, timeInHours, eventName) {
  Logger.log('Creating event for ', date);
  const endTime = getEndTime(date, timeInHours);
  MainCalendar.createEvent(eventName, date, endTime)
}

function createEventsForBouldering(config) {
  try {
  var label = GmailApp.getUserLabelByName(config.label);
  var threads = label.getThreads();
  
  Logger.log(threads.length + " found for this label (" + config.label + ")");
  for (var i = 0; i < threads.length; i++) {
    const message = threads[i].getFirstMessageSubject();
    const date = parseDate(message, config.prefix);
    if (!getExistingEvent(date, config.timeInHours, config.eventName)) {
      createEvent(date, config.timeInHours, config.eventName);
    }
  }
  } catch (error) {
    Logger.log(error);
  }
}

function removeEventsForBouldering(config) {
  try {
  var label = GmailApp.getUserLabelByName(config.cancellationLabel);
  var threads = label.getThreads();
  
  Logger.log(threads.length + " found for this label (" + config.cancellationLabel + ")");
  for (var i = 0; i < threads.length; i++) {
    const message = threads[i].getFirstMessageSubject();
    const date = parseDate(message, config.prefix);
    const existingEvent = getExistingEvent(date, config.timeInHours, config.eventName);
    if (existingEvent) {
      Logger.log('Deleting event for ', date, config.eventName);
      existingEvent.deleteEvent();
    }
  }
  } catch (error) {
    Logger.log(error);
  }
}

function doWork() {
  createEventsForBouldering(ClimbingReservation);
  removeEventsForBouldering(ClimbingReservation);

  createEventsForBouldering(FitnessReservation);
  removeEventsForBouldering(FitnessReservation);
}
