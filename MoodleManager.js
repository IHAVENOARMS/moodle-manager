const MoodleUser = require('moodle-user');
const MoodleSchedule = require('./scheduleObjects/MoodleSchedule');
const MoodleAppointment = require('./scheduleObjects/MoodleAppointment');
const me = require('moodle-user/moodleExceptions');
const _ = require('underscore');

class MoodleManager {
  constructor(usersToManage) {
    this.users = usersToManage;
  }

  async handleEnrollmentErrorForUser(user, exc) {
    if (!_.isEmpty(exc.enrolmentDetails.enrolFormData)) {
      await user.enrolInCourseWithId(exc.enrolmentDetails.courseId);
      this.onUnenrolledCourse(user, exc.enrolmentDetails.courseName);
    } else {
      this.onUnenrollableCourse(user, exc.enrolmentDetails.courseName);
    }
  }

  async inspectQuizzArray(quizArray) {
    this.users.forEach(async (user) => {
      await user.login();
      for (let i = 0; i < quizArray.length; i++) {
        let quiz;
        try {
          quiz = await user.visitQuizWithId(quizArray[i]);
        } catch (exc) {
          if (exc instanceof me.EnrolmentError) {
            this.handleEnrollmentErrorForUser(user, exc);
            quiz = await user.visitQuizWithId(quizArray[i]);
          }
        }

        if (quiz.isEmpty) {
          this.onEmptyQuiz(user, quiz.course, quiz);
          continue;
        }

        if (quiz.hasPendingAttempt) {
          this.onPendingQuiz(user, quiz.course, quiz);
        }

        if (quiz.wasAttendedBefore) {
          this.onAttendedQuiz(user, quiz.course, quiz);
        } else {
          this.onUnattendedQuiz(user, quiz.course, quiz);
        }
      }
      this.onQuizInspectionDone(user);
    });
  }

  async inspectFormAssArray(formAssArray) {
    const firstUser = this.users[0];
    await firstUser.login();
    for (let i = 0; i < formAssArray.length; i++) {
      let formativeAssessment;
      try {
        formativeAssessment = await firstUser.visitQuizWithId(formAssArray[i]);
      } catch (exc) {
        await this.handleEnrollmentErrorForUser(firstUser, exc);
        formativeAssessment = await firstUser.visitQuizWithId(formAssArray[i]);
      }
      if (formativeAssessment.isLocked)
        this.onLockedFormAss(formativeAssessment);
      else this.onUnlockedFormAss(formativeAssessment);
    }
  }

  onUnattendedQuiz = (user, course, quiz) => {};
  onAttendedQuiz = (user, course, quiz) => {};
  onEmptyQuiz = (user, course, quiz) => {};
  onPendingQuiz = (user, course, quiz) => {};
  onUnenrollableCourse = (user, courseName) => {};
  onUnenrolledCourse = (user, courseName) => {};
  onQuizInspectionDone = (user) => {};
  onUnlockedFormAss = (formAss) => {};
  onLockedFormAss = (formAss) => {};
}

const users = [
  new MoodleUser('med2020@8211', '88224646@Aa'),
  new MoodleUser('med2020@8006', 'Gg@12345'),
  new MoodleUser('med2020@8388', 'Gg@12345'),
  new MoodleUser('med2020@8267', 'Paula@ezzat293'),
  new MoodleUser('med2020@8096', 'Gg@12345'),
  new MoodleUser('med2020@8246', 'Gg@12345'),
];

// const thirdYearManager = new MoodleManager(users);
// thirdYearManager.onUnlockedFormAss = (formAss) => {
//   console.log(
//     `Formative assessment with name ${formAss.name} in course ${formAss.course.name} is unlocked!`
//   );
// };

// thirdYearManager.onLockedFormAss = (formAss) => {
//   console.log(
//     `Formative assessment with name ${formAss.name} in course ${formAss.course.name} is locked!`
//   );
// };

// thirdYearManager.onUnattendedQuiz = (user, course, quiz) => {
//   console.log(`${user.studentName} has not attended ${quiz.name}`);

// week1.quizzes = [5533, 6400, 6088, 1877];
// week1.formativeAssessments = [5139, 5322, 6094];

// const schedule = new MoodleSchedule([]);

// const checkFormativeAssessments = new MoodleAppointment(
//   'formativeAssessmentCheckDate',
//   '*/15 * * * * *',
//   () => {
//     thirdYearManager.inspectFormAssArray(week1.formativeAssessments);
//   }
// );

// const checkQuizzes = new MoodleAppointment(
//   'quizInspectionDate',
//   '*/1 * * * *',
//   () => {
//     thirdYearManager.inspectQuizzArray(week1.quizzes);
//   }
// );

// schedule.attachAppointment(checkFormativeAssessments);
// schedule.attachAppointment(checkQuizzes);

// const asyncWrapper = async () => {
//   await users[0].login();
//   const category = await users[0].visitCategoryWithId(22);
//   const lectures = category.lecturesAndQuizzes;
//   console.log(lectures);
// };

// asyncWrapper();

// console.log(util.inspect(schedule));
