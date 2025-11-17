import type { Metadata } from "next";
import { isBoothRegistrationOpen } from "@/lib/features/booth-registration";
import { RegisterForm } from "@/components/register/register-form";
import "./register.css";

export const metadata: Metadata = {
  title: "부스 등록 | Festival Connect",
};

export default async function BoothRegisterPage() {
  const isOpen = await isBoothRegistrationOpen();

  if (!isOpen) {
    return (
      <div className="register-wrapper">
        <div className="register-closed">
          <p>지금은 부스 등록 기간이 아닙니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-wrapper">
      <div className="register-page">
        <h1 className="register-title">부스 등록</h1>
        <RegisterForm />
      </div>
    </div>
  );
}
