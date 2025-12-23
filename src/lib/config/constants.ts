export const BOOTH_RECENT_VISIT_LIMIT = 25;

export const FEED_PAGE_DEFAULT_SIZE = 8;
export const FEED_PAGE_MAX_SIZE = 24;
export const POST_BODY_MAX_LENGTH = 500;
// NOTE: 업로드 엔드포인트(특히 서버리스/프록시)는 요청 바디 크기 제한이 있는 경우가 많습니다.
// 원본 사진은 클라이언트에서 자동으로 리사이즈/압축해서 이 한도 안으로 맞춥니다.
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const TRENDING_WINDOW_MINUTES = 10;
export const TRENDING_MAX_ENTRIES = 3;
export const TRENDING_RATING_WEIGHT = 0.3;
export const TRENDING_RATING_SMOOTHING_WEIGHT = 3;

export const ADMIN_ACTIVE_BOOTH_WINDOW_HOURS = 24;
export const ADMIN_RECENT_POST_LIMIT = 6;
export const ADMIN_RECENT_VISIT_LOG_LIMIT = 10;
export const ADMIN_WARNING_LIMIT = 6;
