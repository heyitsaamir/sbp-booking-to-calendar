const ClimbingReservation = {
  label: "SBP Booking",
  cancellationLabel: "SBP Cancellation",
  prefix: "Booking Confirmed: Seattle Bouldering Project - ",
  timeInHours: 2,
  eventName: 'Climbing Reservation',
  wordsToSearch: ['Climbing Reservation','Upper Walls Reservations', 'Main Floor Climbing', 'Lower Floor Climbing']
}

const FitnessReservation = {
  label: "SBP Fitness",
  cancellationLabel: "SBP Fitness Cancellation",
  prefix: "Booking Confirmed: Seattle Bouldering Project - ",
  timeInHours: 1.5,
  eventName: 'Fitness Reservation',
  wordsToSearch: [],
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

const AamBushCalendar = CalendarApp.getCalendarsByName(calendarName)[0];

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
  const events = AamBushCalendar.getEvents(date, endTime);
  const res =  events.find((event) => { return event.getTitle().search(eventName) >= 0 });
  return res;
}

function getTagsInThread(config, thread) {
  const messages = thread.getMessages();
  if (!messages || messages.length <= 0) return [];
  const firstMessageBody = messages[0].getBody();
  return config.wordsToSearch.filter(function (word) {
    return firstMessageBody.toLowerCase().search(word.toLowerCase()) >= 0;
  });
}

function createEvent(date, config, thread) {
  Logger.log('Creating event for ', date);
  const endTime = getEndTime(date, config.timeInHours);
  const tagsInThread = getTagsInThread(config, thread);
  let tagsAsString = '';
  if (tagsInThread.length > 0) {
    tagsAsString = ' (' + tagsInThread.join(', ') + ')';
  }
  
  const eventName = config.eventName + tagsAsString;
  AamBushCalendar.createEvent(eventName, date, endTime)
  Logger.log('Event ' + eventName + 'created', date);
}

function createEventsForBouldering(config) {
  try {
  var label = GmailApp.getUserLabelByName(config.label);
  var threads = label.getThreads();
  
  Logger.log(threads.length + " found for this label (" + config.label + ")");
  for (var i = 0; i < threads.length; i++) {
    const messageSubject = threads[i].getFirstMessageSubject();
    const date = parseDate(messageSubject, config.prefix);
    if (!getExistingEvent(date, config.timeInHours, config.eventName)) {
      createEvent(date, config, threads[i]);
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
