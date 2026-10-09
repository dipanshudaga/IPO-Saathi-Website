// Counts visits and button clicks on the IPO Saathi website, in the same Mixpanel project as the app.
// No cookies and nothing kept on the device: the visitor code lives in sessionStorage, which the browser
// clears when the tab closes. The address is not stored (ip=0). Nothing is sent at all when the browser
// says Do Not Track or Global Privacy Control. The token is public by design, like the app's.
(function () {
  var TOKEN = 'f0b1a02eae33b9616369b56a33a8362f';
  // Browsers use Mixpanel's own web endpoint with a form-encoded body (a plain request, so no CORS preflight).
  var URL = 'https://api-js.mixpanel.com/track/?ip=0';
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl) {
    window.track = function () {};
    return;
  }
  var env = /(^|\.)(iposaathi\.com|github\.io)$/.test(location.hostname) ? 'production' : 'development';
  function rand() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  var visitor;
  try {
    visitor = sessionStorage.getItem('v');
    if (!visitor) { visitor = rand(); sessionStorage.setItem('v', visitor); }
  } catch (e) { visitor = rand(); }
  var page = (document.body && document.body.getAttribute('data-page')) || 'other';
  var q = new URLSearchParams(location.search);
  var ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
  if (ref === location.hostname) ref = '';

  function send(name, props) {
    var p = { token: TOKEN, distinct_id: visitor, time: Math.floor(Date.now() / 1000), $insert_id: rand(), platform: 'web', environment: env, page: page, device_type: innerWidth < 760 ? 'mobile' : 'desktop' };
    for (var k in props) p[k] = props[k];
    try {
      var data = btoa(unescape(encodeURIComponent(JSON.stringify([{ event: name, properties: p }]))));
      fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(data), keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  window.track = send;

  send('web_page_viewed', { referrer_host: ref, utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '' });

  // Any element with data-track: "download_header" and "download_badge" count as a download click, the rest as a link click.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (!el) return;
    var v = el.getAttribute('data-track');
    if (v.indexOf('download_') === 0) send('web_download_clicked', { placement: v.slice(9) });
    else send('web_link_clicked', { link: v });
  }, true);

  // A question opened in the FAQ (the toggle event does not bubble, so listen while it travels down).
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d && d.tagName === 'DETAILS' && d.open && d.closest('.faq')) send('web_faq_opened', { question: d.querySelector('summary').textContent.trim() });
  }, true);
})();
