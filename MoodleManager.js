const MoodleUser = require('moodle-user');
const MoodleSchedule = require('./scheduleObjects/MoodleSchedule');
const MoodleAppointment = require('./scheduleObjects/MoodleAppointment');
const me = require('moodle-user/moodleExceptions');
const _ = require('underscore');
const MoodleWeek = require('./scheduleObjects/MoodleWeek');

class MoodleManager {
  constructor(usersToManage) {
    this.users = usersToManage;
    this.defaultUser = null;
  }

  async handleEnrollmentErrorForUser(user, exc) {
    if (!_.isEmpty(exc.enrolmentDetails.enrolFormData)) {
      await user.enrolInCourseWithId(exc.enrolmentDetails.courseId);
      this.onFoundUnenrolledCourse(user, exc.enrolmentDetails.courseName);
    } else {
      this.onFoundUnenrollableCourse(user, exc.enrolmentDetails.courseName);
    }
  }

  async checkUserEnrollmentWithQuiz(user, quizId) {
    let quiz;
    try {
      quiz = await user.visitQuizWithId(quizId);
    } catch (exc) {
      if (exc instanceof me.EnrolmentError) {
        this.handleEnrollmentErrorForUser(user, exc);
        quiz = await user.visitQuizWithId(quizId);
      } else throw exc;
    }
    return quiz;
  }

  async inspectQuizWithId(quizId) {
    this.users.forEach(async (user) => {
      await user.login();
      const quiz = await this.checkUserEnrollmentWithQuiz(user, quizId);
      if (quiz.isEmpty) {
        this.onFoundEmptyQuiz(user, quiz.course, quiz);
        return;
      }

      if (quiz.hasPendingAttempt) {
        this.onFoundPendingQuiz(user, quiz.course, quiz);
      }

      if (quiz.wasAttendedBefore) {
        this.onFoundAttendedQuiz(user, quiz.course, quiz);
      } else {
        this.onFoundUnattendedQuiz(user, quiz.course, quiz);
      }
      this.onFinishedInspectingQuizz(user);
    });
  }

  async inspectQuizzesWithId(quizArray) {
    this.users.forEach(async (user) => {
      await user.login();
      for (let i = 0; i < quizArray.length; i++) {
        await this.inspectQuizWithId(quizArray[i]);
      }
      this.onFinishedInspectingQuizzes(user);
    });
  }

  async inspectFormAssArray(formAssArray) {
    await this.defaultUser.login();
    for (let i = 0; i < formAssArray.length; i++) {
      const formativeAssessment = await this.checkUserEnrollmentWithQuiz(
        this.defaultUser,
        formAssArray[i]
      );

      if (formativeAssessment.isLocked)
        this.onFoundLockedFormAss(formativeAssessment);
      else this.onFoundUnlockedFormAss(formativeAssessment);
    }
  }

  async solveQuiz(quizId, finishedAttempt) {
    this.users.forEach(async (user) => {
      await user.login();
      const quiz = await this.checkUserEnrollmentWithQuiz(user, quizId);
      const result = await user.solveQuiz(quiz, finishedAttempt);
      this.onFinishedSolvingQuiz(user, quiz.course, quiz, result);
    });
  }

  async solveQuizFromDefaultUser(quizId) {
    await this.defaultUser.login();
    const quiz = await this.checkUserEnrollmentWithQuiz(
      this.defaultUser,
      quizId
    );
    let finishedAttempt;
    if (quiz.wasAttendedBefore) {
      const firstAttempt = quiz.attempts.at(-1);
      finishedAttempt = await this.defaultUser.reviewAttempt(
        firstAttempt.id,
        firstAttempt.cmid
      );
      this.onAcquiredSolutionFromUser(this.defaultUser, quiz.course, quiz);
    } else {
      finishedAttempt = await this.defaultUser.attendQuiz(quiz);
      this.onFinishedAttendingQuiz(
        this.defaultUser,
        quiz.course,
        quiz,
        finishedAttempt
      );
    }
    await this.solveQuiz(quizId, finishedAttempt);
  }

  async attendQuiz(quizId) {
    this.users.forEach(async (user) => {
      await user.login();
      const quiz = await this.checkUserEnrollmentWithQuiz(user, quizId);
      const result = await user.attendQuiz(quiz);
      this.onFinishedAttendingQuiz(user, quiz.course, quiz, result);
    });
  }

  onFoundUnattendedQuiz = (user, course, quiz) => {};
  onFoundAttendedQuiz = (user, course, quiz) => {};
  onFoundEmptyQuiz = (user, course, quiz) => {};
  onFoundPendingQuiz = (user, course, quiz) => {};
  onFinishedAttendingQuiz = (user, course, quiz, result) => {};
  onFinishedSolvingQuiz = (user, course, quiz, result) => {};
  onAcquiredSolutionFromUser = (user, course, quiz) => {};
  onFoundUnenrollableCourse = (user, courseName) => {};
  onFoundUnenrolledCourse = (user, courseName) => {};
  onFinishedInspectingQuizz = (user) => {};
  onFinishedInspectingQuizzes = (user) => {};
  onFoundUnlockedFormAss = (formAss) => {};
  onFoundLockedFormAss = (formAss) => {};
}

const users = [
  new MoodleUser('med2020@8211', '88224646@Aa'),
  new MoodleUser('med2020@8006', 'Gg@12345'),
  new MoodleUser('med2020@8388', 'Gg@12345'),
  new MoodleUser('med2020@8267', 'Paula@ezzat293'),
  new MoodleUser('med2020@8096', 'Gg@12345'),
  new MoodleUser('med2020@8246', 'Gg@12345'),
];

const thirdYearManager = new MoodleManager(users);
thirdYearManager.defaultUser = users[0];
thirdYearManager.onFoundUnlockedFormAss = (formAss) => {
  console.log(
    `Formative assessment with name ${formAss.name} in course ${formAss.course.name} is unlocked!`
  );
};

thirdYearManager.onFoundLockedFormAss = (formAss) => {
  console.log(
    `Formative assessment with name ${formAss.name} in course ${formAss.course.name} is locked!`
  );
};

thirdYearManager.onFoundUnattendedQuiz = (user, course, quiz) => {
  console.log(`${user.studentName} has not attended ${quiz.name}`);
};

thirdYearManager.onFoundAttendedQuiz = (user, course, quiz) => {
  console.log(`${user.studentName} is a good boy! ${quiz.name}`);
};

thirdYearManager.onFinishedSolvingQuiz = (user, course, quiz, result) => {
  console.log(
    `Finished solving quiz for ${user.studentName} with a grade of ${result.info.grade}`
  );
};

const week1 = new MoodleWeek();
week1.quizzes = [5533, 6400, 6088, 1877];
week1.formativeAssessments = [5139, 5322, 6094];

const checkFormativeAssessments = new MoodleAppointment(
  'formativeAssessmentCheckDate',
  '*/15 * * * * *',
  () => {
    thirdYearManager.inspectFormAssArray(week1.formativeAssessments);
  }
);

const checkQuizzes = new MoodleAppointment(
  'quizInspectionDate',
  '*/1 * * * * *',
  () => {
    thirdYearManager.inspectQuizWithId(6400);
  },
  1
);

const schedule = new MoodleSchedule([checkFormativeAssessments, checkQuizzes]);

// const asyncWrapper = async () => {
//   await users[0].login();
//   const category = await users[0].visitCategoryWithId(22);
//   const lectures = category.lecturesAndQuizzes;
//   console.log(lectures);
// };

// asyncWrapper();

// console.log(util.inspect(schedule));
