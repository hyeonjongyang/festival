export class StudentAccessError extends Error {
  constructor(message = "학생 계정만 접근할 수 있습니다.") {
    super(message);
    this.name = "StudentAccessError";
  }
}

export class NicknameLockedError extends Error {
  constructor(message = "닉네임을 더 이상 변경할 수 없습니다.") {
    super(message);
    this.name = "NicknameLockedError";
  }
}
