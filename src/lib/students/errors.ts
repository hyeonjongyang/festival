export class StudentAccessError extends Error {
  constructor(message = "학생 계정만 접근할 수 있습니다.") {
    super(message);
    this.name = "StudentAccessError";
  }
}
