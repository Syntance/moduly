import { submitContact } from "@moduly/magazyn-forms";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const result = await submitContact({ status: "idle" }, formData);

    if (result.status === "success") {
      return NextResponse.json({
        ok: true,
        caseNumber: result.caseNumber,
        topic: result.topic,
        topicOther: result.topicOther,
      });
    }

    if (result.status === "error") {
      return NextResponse.json(
        {
          ok: false,
          errors: result.errors,
          message: result.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: false, message: "Nie udało się wysłać formularza." }, { status: 400 });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Nie udało się wysłać formularza. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
