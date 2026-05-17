;(function () {
  function fleetApiPath(path) {
    const p = path.startsWith('/') ? path.slice(1) : path
    if (/^\/apps\/[^/]+/.test(window.location.pathname)) return p
    return '/' + p
  }

  const form = document.getElementById('analyze-form')
  const siteField = document.getElementById('field-site')
  const siteError = document.getElementById('field-site-error')
  const outputPre = document.getElementById('field-output')
  const submitRow = document.getElementById('submit-row')
  const btn = document.getElementById('btn-submit')
  const btnCopy = document.getElementById('btn-copy')
  const err = document.getElementById('alert-error')
  const progressRoot = document.getElementById('fetch-progress')
  const progressBar = document.getElementById('fetch-progress-bar')
  const progressStepPlan = document.getElementById('progress-step-plan')
  const progressStepContent = document.getElementById('progress-step-content')
  if (
    !form ||
    !siteField ||
    !siteError ||
    !outputPre ||
    !submitRow ||
    !btn ||
    !err
  ) {
    return
  }

  const OUTPUT_PLACEHOLDER = 'Enter a site URL, then fetch.'

  let debounceId = 0
  /** @type {string | null} */
  let loadedForUrl = null
  let hasOutput = false
  /** @type {Record<string, unknown> | null} */
  let lastSummary = null
  let copyLabelDefault = btnCopy ? btnCopy.textContent || 'copy' : 'copy'

  /** @param {'pending'|'current'|'done'|'error'|'skipped'} state */
  function fetchStepClass(state) {
    switch (state) {
      case 'done':
      case 'skipped':
        return 'step step-primary'
      case 'current':
        return 'step fetch-step-current'
      case 'error':
        return 'step step-error'
      default:
        return 'step'
    }
  }

  /**
   * @param {string} plan
   * @param {string} content
   */
  function fetchProgressBarValue(plan, content) {
    if (content === 'done' || content === 'skipped') return 100
    if (plan === 'done') return 50
    if (plan === 'current') return 25
    return 0
  }

  /**
   * @param {{
   *   plan: 'pending'|'current'|'done'|'error',
   *   content: 'pending'|'current'|'done'|'error'|'skipped',
   * }} cfg
   */
  function renderFetchProgress(cfg) {
    if (!progressRoot || !progressBar || !progressStepPlan || !progressStepContent) {
      return
    }
    progressRoot.classList.remove('hidden')
    progressBar.value = String(fetchProgressBarValue(cfg.plan, cfg.content))
    progressStepPlan.className = fetchStepClass(cfg.plan)
    progressStepContent.className = fetchStepClass(cfg.content)
  }

  function hideFetchProgress() {
    if (!progressRoot) return
    progressRoot.classList.add('hidden')
    if (progressBar) progressBar.value = '0'
    if (progressStepPlan) progressStepPlan.className = 'step'
    if (progressStepContent) progressStepContent.className = 'step'
  }

  function syncCopyButton() {
    if (!btnCopy) return
    const text = String(outputPre.textContent ?? '')
    const ready = hasOutput && text.length > 0 && text !== OUTPUT_PLACEHOLDER
    btnCopy.classList.toggle('hidden', !ready)
    btnCopy.disabled = !ready
    if (ready && btnCopy.textContent !== copyLabelDefault) {
      btnCopy.textContent = copyLabelDefault
    }
  }

  async function copyOutputToClipboard() {
    if (!btnCopy || btnCopy.disabled) return
    const text = String(outputPre.textContent ?? '')
    if (!text || text === OUTPUT_PLACEHOLDER) return
    try {
      await navigator.clipboard.writeText(text)
      btnCopy.textContent = 'copied'
      window.setTimeout(function () {
        if (btnCopy) btnCopy.textContent = copyLabelDefault
      }, 1600)
    } catch {
      showError('Could not copy to clipboard.')
    }
  }

  function siteValidationError() {
    const t = String(siteField.value ?? '').trim()
    if (!t) return 'Site URL required.'
    if (t.length > 2048) return 'URL must be at most 2048 characters.'
    try {
      const u = new URL(t.includes('://') ? t : `https://${t}`)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return 'Only http and https URLs are allowed.'
      }
    } catch {
      return 'Enter a valid URL.'
    }
    return null
  }

  function syncFieldError() {
    const msg = siteValidationError()
    if (msg && String(siteField.value ?? '').trim().length > 0) {
      siteError.textContent = msg
      siteError.classList.remove('hidden')
      siteField.setAttribute('aria-invalid', 'true')
    } else if (!msg) {
      siteError.textContent = ''
      siteError.classList.add('hidden')
      siteField.removeAttribute('aria-invalid')
    } else {
      siteError.textContent = ''
      siteError.classList.add('hidden')
      siteField.removeAttribute('aria-invalid')
    }
  }

  function siteIsValid() {
    return siteValidationError() === null
  }

  function normalizeSiteUrl(raw) {
    const t = String(raw ?? '').trim()
    if (!t) return null
    try {
      return new URL(t.includes('://') ? t : `https://${t}`).href
    } catch {
      return null
    }
  }

  function currentSiteUrl() {
    return normalizeSiteUrl(String(siteField.value ?? ''))
  }

  /** @param {Record<string, unknown> | null} summary */
  function crawlBrowserAvailable(summary) {
    const crawl = summary && summary.crawl
    const crawlRec =
      crawl && typeof crawl === 'object' ? /** @type {Record<string, unknown>} */ (crawl) : null
    return crawlRec && crawlRec.browser === 'available'
  }

  function syncSubmitRow() {
    syncFieldError()
    const site = currentSiteUrl()
    const hideFetch =
      hasOutput && site !== null && loadedForUrl !== null && site === loadedForUrl
    submitRow.classList.toggle('hidden', hideFetch)
    btn.disabled = !siteIsValid() || hideFetch
  }

  function scheduleSync() {
    window.clearTimeout(debounceId)
    debounceId = window.setTimeout(syncSubmitRow, 80)
  }

  function hideError() {
    err.classList.add('hidden')
    err.textContent = ''
  }

  function showError(message) {
    hideError()
    err.textContent = message
    err.classList.remove('hidden')
  }

  function setOutputHandoff(handoff) {
    outputPre.textContent = JSON.stringify(handoff, null, 2)
    syncCopyButton()
  }

  function handoffFromResponse(data) {
    if (data.handoff && typeof data.handoff === 'object') {
      return data.handoff
    }
    return null
  }

  async function budgetAllowsContent() {
    try {
      const r = await fetch(fleetApiPath('api/browser-budget'))
      const d = /** @type {Record<string, unknown>} */ (await r.json().catch(() => ({})))
      const budget = d.budget
      if (budget && typeof budget === 'object') {
        return /** @type {Record<string, unknown>} */ (budget).available === true
      }
    } catch {
      /* ignore */
    }
    return true
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', copyOutputToClipboard)
  }

  siteField.addEventListener('input', function () {
    const site = currentSiteUrl()
    if (site !== loadedForUrl) {
      hasOutput = false
      lastSummary = null
      hideFetchProgress()
      syncCopyButton()
    }
    scheduleSync()
  })
  siteField.addEventListener('change', syncSubmitRow)

  syncSubmitRow()

  form.addEventListener('submit', async function (e) {
    e.preventDefault()
    hideError()

    const validationError = siteValidationError()
    if (validationError) {
      showError(validationError)
      syncFieldError()
      siteField.focus()
      return
    }

    const site = currentSiteUrl()
    if (!site) {
      showError('Enter a valid URL.')
      return
    }

    btn.disabled = true
    btn.setAttribute('aria-busy', 'true')
    renderFetchProgress({ plan: 'current', content: 'pending' })

    try {
      const res = await fetch(fleetApiPath('api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site }),
      })
      const data = /** @type {Record<string, unknown>} */ (await res.json().catch(() => ({})))

      if (!res.ok) {
        renderFetchProgress({ plan: 'error', content: 'pending' })
        const msg =
          typeof data.message === 'string'
            ? data.message
            : typeof data.error === 'string'
              ? data.error
              : 'Request failed.'
        showError(msg)
        syncSubmitRow()
        return
      }

      const summary = data.summary
      if (!summary || typeof summary !== 'object') {
        renderFetchProgress({ plan: 'error', content: 'pending' })
        outputPre.textContent = 'No summary returned.'
        hasOutput = false
        syncCopyButton()
        showError('Unexpected response.')
        return
      }

      lastSummary = /** @type {Record<string, unknown>} */ (summary)
      loadedForUrl = site
      hasOutput = true

      let runContent = crawlBrowserAvailable(lastSummary)
      if (runContent) {
        runContent = await budgetAllowsContent()
      }

      const planHandoff = handoffFromResponse(data)
      if (planHandoff) setOutputHandoff(planHandoff)

      if (!runContent) {
        renderFetchProgress({ plan: 'done', content: 'skipped' })
        return
      }

      renderFetchProgress({ plan: 'done', content: 'current' })

      const resContent = await fetch(fleetApiPath('api/content'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: lastSummary }),
      })
      const dataContent = /** @type {Record<string, unknown>} */ (
        await resContent.json().catch(() => ({}))
      )
      if (!resContent.ok) {
        renderFetchProgress({ plan: 'done', content: 'error' })
        const msg =
          typeof dataContent.message === 'string'
            ? dataContent.message
            : typeof dataContent.error === 'string'
              ? dataContent.error
              : 'Browser fetch failed.'
        showError(msg)
        syncSubmitRow()
        return
      }

      const fullHandoff = handoffFromResponse(dataContent)
      if (fullHandoff) setOutputHandoff(fullHandoff)
      renderFetchProgress({ plan: 'done', content: 'done' })
    } catch {
      renderFetchProgress({ plan: 'error', content: 'pending' })
      showError('Network error.')
    } finally {
      btn.removeAttribute('aria-busy')
      syncSubmitRow()
    }
  })
})()
