/**
 * Stream entire HTML responses and collect anchor hrefs (no body size cap).
 * @see https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/
 */
export async function collectHrefsFromResponse(res: Response): Promise<string[]> {
  const hrefs: string[] = []

  class HrefCollector {
    element(element: Element) {
      const href = element.getAttribute('href')
      if (href) hrefs.push(href)
    }
  }

  await new HTMLRewriter()
    .on('a[href]', new HrefCollector())
    .transform(res)
    .arrayBuffer()

  return hrefs
}
