class MoodleAppointment {
  constructor(
    name,
    cronExpression,
    functionToExecute,
    timesToExecute = Infinity
  ) {
    this.name = name;
    this.cronExpression = cronExpression;
    this.functionToExecute = functionToExecute;
    this.eventName =
      'on' + name.at(0).toUpperCase() + name.substring(1) + 'Reached';
    this.times = timesToExecute;
  }
}

module.exports = MoodleAppointment;
