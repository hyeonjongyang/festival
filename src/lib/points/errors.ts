export class BoothAccessError extends Error {
  constructor(message = "부스 정보를 불러올 수 없습니다.") {
    super(message);
    this.name = "BoothAccessError";
  }
}

export class StudentNotFoundError extends Error {
  constructor(message = "일치하는 학생 QR을 찾을 수 없습니다.") {
    super(message);
    this.name = "StudentNotFoundError";
  }
}

export class DuplicateAwardError extends Error {
  availableAt: Date;

  constructor(availableAt: Date, message = "같은 학생에게는 30분 이내에 다시 지급할 수 없습니다.") {
    super(message);
    this.name = "DuplicateAwardError";
    this.availableAt = availableAt;
  }
}
