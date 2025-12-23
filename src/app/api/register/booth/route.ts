import { NextResponse } from "next/server";
import { z } from "zod";
import { isBoothRegistrationOpen } from "@/lib/features/booth-registration";
import { registerBoothSelfService } from "@/lib/booth/self-registration";
import { getRequestIp, rateLimit } from "@/lib/security/rate-limit";

const registrationSchema = z.object({
  boothName: z.string().min(2).max(40),
  location: z.string().max(60).optional(),
  description: z.string().max(400).optional(),
});

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limiter = rateLimit({
    key: `register-booth:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!limiter.allowed) {
    return NextResponse.json(
      { ok: false, message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limiter.retryAfterSeconds),
        },
      },
    );
  }

  if (!(await isBoothRegistrationOpen())) {
    return NextResponse.json(
      { ok: false, message: "현재는 부스 등록을 받지 않고 있습니다." },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "입력값을 확인해주세요.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await registerBoothSelfService(parsed.data);
    return NextResponse.json({
      ok: true,
      boothId: result.boothId,
      boothName: result.boothName,
      code: result.loginCode,
      qrToken: result.qrToken,
    });
  } catch (error) {
    console.error("Failed to self-register booth", error);
    const message =
      error instanceof Error
        ? error.message
        : "부스를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.";
    const status = error instanceof Error && error.message.includes("부스 이름")
      ? 409
      : 500;

    return NextResponse.json({ ok: false, message }, { status });
  }
}
