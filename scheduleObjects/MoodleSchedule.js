const { AppointmentAlreadyExists } = require('moodle-user/moodleExceptions');
const CronJob = require('node-cron');

class MoodleSchedule {
  checkAppointmentError(appointment) {
    if (this[appointment.eventName] !== undefined)
      throw new AppointmentAlreadyExists(appointment);
  }

  attachAppointment(appointment) {
    this.checkAppointmentError(appointment);
    this.attachedAppointments[appointment.name] = appointment;
    this[appointment.eventName] = CronJob.schedule(
      appointment.cronExpression,
      () => {
        if (appointment.times > 0) {
          appointment.functionToExecute();
          appointment.times -= 1;
        } else {
          this.detachAppointment(appointment);
        }
      }
    );
    this[appointment.eventName].start();
  }

  constructor(appointments) {
    this.attachedAppointments = {};
    for (let i = 0; i < appointments.length; i++) {
      this.attachAppointment(appointments[i]);
    }
  }

  detachAppointment(appointment) {
    this[appointment.eventName].stop();
    delete this.attachedAppointments[appointment.name];
    delete this[appointment.eventName];
  }

  detachAppointmentWithName(appointmentName) {
    const eventName = this.attachedAppointments[appointmentName].eventName;
    this[eventName].stop();
    delete this.attachedAppointments[appointmentName];
    delete this[eventName];
  }
}

module.exports = MoodleSchedule;
