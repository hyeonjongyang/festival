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
