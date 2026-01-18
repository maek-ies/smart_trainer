export default async (req, context) => {
    // Only allow GET and POST
    if (req.method !== "GET" && req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const API_BASE = "https://intervals.icu/api/v1";

    // Strip '/api/intervals' from the path to get the target endpoint
    const path = new URL(req.url).pathname.replace("/api/intervals", "");
    const targetUrl = `${API_BASE}${path}${new URL(req.url).search}`;

    console.log(`[Proxy] Forwarding ${req.method} request to: ${targetUrl}`);

    // Forward specific headers
    const headers = new Headers();
    if (req.headers.get("authorization")) {
        headers.set("Authorization", req.headers.get("authorization"));
    }
    if (req.headers.get("content-type")) {
        headers.set("Content-Type", req.headers.get("content-type"));
    }
    headers.set("Accept", "application/json");

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: req.method === "POST" ? req.body : undefined,
        });

        console.log(`[Proxy] Response status: ${response.status}`);

        // Create a new Headers object for the response
        const responseHeaders = new Headers(response.headers);

        // Remove headers that might cause issues if forwarded directly
        // node-fetch/native fetch usually decompresses the body, so forwarding content-encoding: gzip is bad
        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");
        responseHeaders.delete("transfer-encoding");

        // Forward the response back to the client
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error("[Proxy] Error:", error);
        return new Response(JSON.stringify({ error: "Proxy Error", details: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
