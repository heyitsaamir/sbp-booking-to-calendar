# sbp-booking-to-calendar
Takes booking emails from Seattle Bouldering Project and puts them in your google cal

1. Create a filter in your gmail that takes the booking emails and labels them with `SBP Booking`
2. Create a filter in your gmail that takes the cancellation emails and labels them with `SBP Cancellation`
3. Do the above two for Fitness (`SBP Fitness` and `SBP Fitness Cancellation`)
4. Copy paste the script to https://script.google.com/
5. Change the script with your own calendar name. (make any other adjustments needed to the consts)
6. Save it.
7. Add a trigger to run `doWork` function. I run it daily at 1am.
