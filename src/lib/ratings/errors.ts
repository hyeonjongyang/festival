export class BoothRatingConflictError extends Error {
  constructor(message = "이미 이 부스에 대한 평점을 남겼습니다.") {
    super(message);
    this.name = "BoothRatingConflictError";
  }
}

export class MissingVisitHistoryError extends Error {
  constructor(message = "방문 기록이 있는 부스만 평점을 남길 수 있습니다.") {
    super(message);
    this.name = "MissingVisitHistoryError";
  }
}

export class BoothRatingNotFoundError extends Error {
  constructor(message = "아직 이 부스에 남긴 평점이 없습니다.") {
    super(message);
    this.name = "BoothRatingNotFoundError";
  }
}

export class BoothRatingEditWindowExpiredError extends Error {
  constructor(message = "평점 수정은 방문 후 10분까지만 가능합니다.") {
    super(message);
    this.name = "BoothRatingEditWindowExpiredError";
  }
}
