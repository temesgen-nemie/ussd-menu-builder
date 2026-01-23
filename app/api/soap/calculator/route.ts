import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const xml = await req.text();

  const resp = await fetch("http://www.dneonline.com/calculator.asmx", {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: req.headers.get("soapaction") ?? "http://tempuri.org/Add",
    },
    body: xml,
    cache: "no-store",
  });

  const text = await resp.text();

  return new NextResponse(text, {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("content-type") ?? "text/xml; charset=utf-8",
    },
  });
}
