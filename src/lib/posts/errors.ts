export class PostNotFoundError extends Error {
  constructor(message = "게시글을 찾을 수 없습니다.") {
    super(message);
    this.name = "PostNotFoundError";
  }
}

export class PostValidationError extends Error {
  constructor(message = "게시글 입력값을 확인해주세요.") {
    super(message);
    this.name = "PostValidationError";
  }
}

export class PostDeleteForbiddenError extends Error {
  constructor(message = "게시글을 삭제할 권한이 없습니다.") {
    super(message);
    this.name = "PostDeleteForbiddenError";
  }
}
