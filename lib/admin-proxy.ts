import { NextResponse } from "next/server"

const getBackendUrl = () => {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "")
}

export async function proxyToBackend(
  req: Request,
  targetPath: string
): Promise<Response | null> {
  const backendBase = getBackendUrl()
  const targetUrl = `${backendBase}${targetPath}`

  try {
    const forwardHeaders = new Headers(req.headers)
    forwardHeaders.delete("host")
    forwardHeaders.delete("connection")

    const init: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      const contentType = req.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        init.body = await req.text()
      } else if (contentType.includes("multipart/form-data") || contentType.includes("form")) {
        init.body = await req.arrayBuffer()
      } else {
        const text = await req.text()
        if (text) init.body = text
      }
    }

    const res = await fetch(targetUrl, init)
    const resBuffer = await res.arrayBuffer()

    const responseHeaders = new Headers()
    const contentType = res.headers.get("content-type")
    if (contentType) responseHeaders.set("content-type", contentType)

    return new NextResponse(resBuffer, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    })
  } catch {
    return null
  }
}
