export class BoothAccessError extends Error {
  constructor(message = "부스 정보를 불러올 수 없습니다.") {
    super(message);
    this.name = "BoothAccessError";
  }
}

export class BoothNotFoundError extends Error {
  constructor(message = "일치하는 부스 QR을 찾을 수 없습니다.") {
    super(message);
    this.name = "BoothNotFoundError";
  }
}

export class DuplicateVisitError extends Error {
  lastVisitedAt: Date;

  constructor(
    lastVisitedAt: Date,
    message = "같은 부스는 한 번만 방문할 수 있습니다.",
  ) {
    super(message);
    this.name = "DuplicateVisitError";
    this.lastVisitedAt = lastVisitedAt;
  }
}
