export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const response = await fetch(request);

    if (response.status === 404 && !pathname.includes(".")) {
      const indexUrl = new URL("/index.html", request.url);
      return fetch(new Request(indexUrl, request));
    }

    return response;
  },
};
