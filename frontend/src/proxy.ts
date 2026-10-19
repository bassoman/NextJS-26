// frontend/src/proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expectedUsername =
    process.env.ADMIN_DIAGNOSTIC_USER ??
    process.env.PROTECTED_PAGE_USERNAME;
  const expectedPassword =
    process.env.ADMIN_DIAGNOSTIC_PASS ??
    process.env.PROTECTED_PAGE_PASSWORD;

  if (authorization) {
    const [scheme, encodedCredentials] = authorization.split(" ");

    if (scheme === "Basic" && encodedCredentials) {
      const decodedCredentials = Buffer.from(
        encodedCredentials,
        "base64"
      ).toString("utf8");

      const separatorPosition = decodedCredentials.indexOf(":");

      if (separatorPosition !== -1) {
        const username = decodedCredentials.slice(0, separatorPosition);
        const password = decodedCredentials.slice(separatorPosition + 1);

        if (
          username === expectedUsername &&
          password === expectedPassword
        ) {
          return NextResponse.next();
        }
      }
    }
  }

  // No credentials, malformed credentials, or incorrect credentials.
  return new NextResponse("Authentication required. See Board Officer for access.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CARC Administration"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: [
    "/test-get-full-name/:path*",
    "/test-get-last-entries/:path*",
    "/members/:path*",
  ],
};
