interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      const hasExtension = /\.\w+$/.test(pathname);

      if (hasExtension || pathname.startsWith("/assets/")) {
        const response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
          return new Response("Not Found", { status: 404 });
        }
        return response;
      }

      const indexRequest = new Request(new URL("/index.html", url.origin), {
        method: request.method,
        headers: request.headers,
      });

      return env.ASSETS.fetch(indexRequest);
    } catch (error) {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
